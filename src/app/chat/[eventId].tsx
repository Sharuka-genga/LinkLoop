import { useAuth } from "@/context/auth-context";
import {
    cancelPendingMessage,
    checkIfUserCheckedIn,
    checkInToEvent,
    confirmMessageSent,
    createPoll,
    DbPresence,
    deleteMessageForEveryone,
    flushScheduledMessages,
    getCheckInCount,
    getDbPresenceStatus,
    getEventSummary,
    getMessages,
    getPolls,
    logScreenshot,
    Message,
    MessageMetadata,
    parseMessageContent,
    pinMessage,
    Poll,
    PresenceState,
    requestMediaAccess,
    scheduleMessage,
    sendMessage,
    subscribeToMessages,
    subscribeToTypingStatus,
    trackPresence,
    TypingStatus,
    updateTypingStatus,
    updateUserStatus,
    uploadChatMedia,
    verifyChatAccess,
    voteInPoll
} from "@/lib/chat";
import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    AlertTriangle,
    BarChart2,
    Calendar,
    Camera,
    CheckCircle2,
    ChevronLeft,
    Clock,
    EyeOff,
    Info,
    Lock,
    MapPin,
    MoreVertical,
    Paperclip,
    Pin,
    Send,
    ShieldAlert,
    Trash2,
    UserMinus,
    X
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator, Alert,
    AppState,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Image as RNImage,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const DELETE_TIME_LIMIT_MS = 60 * 60 * 1000; // 1 hour

const ICEBREAKERS = [
  "Hi everyone 👋",
  "What time are we meeting?",
  "Anyone bringing equipment?",
  "Looking forward to this! 🔥"
];

export default function ChatScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [deletedMessageIds, setDeletedMessageIds] = useState<string[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Advanced Features State (Anonymous, Schedule, Undo)
  const [isAnonymousMode, setIsAnonymousMode] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<Record<string, any>>({});
  
  // Poll State
  const [isPollModalVisible, setPollModalVisible] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  
  // Deletion Modal State
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);

  // Presence & Activity State
  const [presenceState, setPresenceState] = useState<Record<string, PresenceState>>({});
  const [dbProfiles, setDbProfiles] = useState<Record<string, DbPresence>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, { fullName: string; timestamp: number }>>({});
  const [dbTypingUsers, setDbTypingUsers] = useState<TypingStatus[]>([]);
  const [currentUserStatus, setCurrentUserStatus] = useState<'active' | 'idle' | 'offline'>('active');
  const [showLocation, setShowLocation] = useState(false);

  // Attachment & Upload State
  const [isAttachModalVisible, setAttachModalVisible] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);

  // Advanced Features State
  const [checkInCount, setCheckInCount] = useState(0);
  const [hasArrived, setHasArrived] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [spamCount, setSpamCount] = useState(0);
  const [isSpamBlocked, setIsSpamBlocked] = useState(false);
  const [eventSummary, setEventSummary] = useState<any>(null);
  const [isEventClosed, setIsEventClosed] = useState(false);
  
  // Privacy & Permission State
  const [selectedPermission, setSelectedPermission] = useState<'view_only' | 'request' | 'allow'>('allow');
  const [showScreenshotWarning, setShowScreenshotWarning] = useState(false);
  const [lastScreenshotUser, setLastScreenshotUser] = useState<string | null>(null);
  
  const flatListRef = useRef<FlatList>(null);
  const lastActiveRef = useRef(Date.now());
  const lastMessageTimeRef = useRef(Date.now());
  const typingTimeoutRef = useRef<any>(null);
  const idleTimerRef = useRef<any>(null);
  const resetIdleTimerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!eventId) return;

    const checkAccess = async () => {
        try {
            const hasAccess = await verifyChatAccess(eventId);
            if (!hasAccess) {
                Alert.alert("Access Denied", "You are not a participant of this event.");
                router.replace("/");
                return;
            }
        } catch (error) {
            console.error("Access verification failed:", error);
        }
    };
    checkAccess();

    const channel = supabase.channel(`event_chat:${eventId}`);

    const msgSub = subscribeToMessages(eventId, (newMessage, eventType) => {
      if (eventType === 'INSERT') {
        setMessages((prev) => {
          if (prev.some(m => m.id === newMessage.id)) {
            // Already added optimistically, just update status
            return prev.map(m => m.id === newMessage.id ? { ...newMessage, status: 'delivered' } : m);
          }
          return [...prev, { ...newMessage, status: 'delivered' }];
        });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      } else if (eventType === 'UPDATE') {
        if (newMessage.status === 'cancelled') {
            // Remove cancelled (undone) messages from the list
            setMessages((prev) => prev.filter(m => m.id !== newMessage.id));
        } else {
            setMessages((prev) => prev.map(m => m.id === newMessage.id ? newMessage : m));
        }
      }
    });

    // Presence & Activity Subscriptions
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // ✅ FIX: Re-key by user_id (NOT by Supabase's internal random channel key)
        const simplifiedState: Record<string, PresenceState> = {};
        Object.keys(state).forEach((key) => {
          const presence = state[key][0] as any as PresenceState;
          if (presence?.user_id) {
            simplifiedState[presence.user_id] = presence;
          }
        });
        setPresenceState(simplifiedState);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        const currentUserId = user?.id;
        const joinedPresence = newPresences[0] as any as PresenceState;
        const joinedUserId = joinedPresence?.user_id;
        if (joinedUserId && joinedUserId !== currentUserId) {
          const name = joinedPresence?.full_name || "Someone";
          const sysMsg: Message = {
            id: `sys-join-${Date.now()}`,
            event_id: eventId!,
            sender_id: 'system',
            content: `${name} joined the chat`,
            created_at: new Date().toISOString(),
            status: 'sent'
          };
          setMessages(prev => [...prev, sysMsg]);
          // Refresh DB presence for this user to get latest is_online state
          getDbPresenceStatus([joinedUserId]).then(result => {
            setDbProfiles(prev => ({ ...prev, ...result }));
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        const currentUserId = user?.id;
        const leftPresence = leftPresences[0] as any as PresenceState;
        const leftUserId = leftPresence?.user_id;
        if (leftUserId && leftUserId !== currentUserId) {
          const name = leftPresence?.full_name || "Someone";
          const sysMsg: Message = {
            id: `sys-leave-${Date.now()}`,
            event_id: eventId!,
            sender_id: 'system',
            content: `${name} left the chat`,
            created_at: new Date().toISOString(),
            status: 'sent'
          };
          setMessages(prev => [...prev, sysMsg]);
        }
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const { userId, fullName, isTyping } = payload;
        setTypingUsers((prev) => {
          const next = { ...prev };
          if (isTyping) {
            next[userId] = { fullName, timestamp: Date.now() };
          } else {
            delete next[userId];
          }
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && user?.id) {
          await trackPresence(channel, user.id, {
            full_name: profile?.full_name || 'You',
            profile_picture_url: profile?.profile_picture_url || undefined,
          }, 'active');
        }
      });

    // Idle Timer Logic
    const resetIdleTimer = () => {
      lastActiveRef.current = Date.now();
      if (currentUserStatus !== 'active' && user?.id) {
        setCurrentUserStatus('active');
        trackPresence(channel, user.id, { full_name: "You" }, 'active');
      }
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        setCurrentUserStatus('idle');
        if (user?.id) trackPresence(channel, user.id, { full_name: "You" }, 'idle');
      }, 2 * 60 * 1000); // 2 minutes
    };

    resetIdleTimerRef.current = resetIdleTimer;
    resetIdleTimer();

    loadInitialData();

    const voteSub = supabase
      .channel(`chat-votes-${eventId}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.eventType === 'UPDATE' && payload.new.is_pinned !== undefined) {
           loadInitialData(); // Refresh to get correct pinned state
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_checkins' }, () => {
         fetchCheckInCount();
      })
      .subscribe();

    // ✅ NEW: Live DB presence subscription — keeps yellow dot accurate
    // Watches profiles.is_online changes for all event participants in real-time
    const presenceSub = supabase
      .channel(`db-presence-${eventId}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
      }, (payload) => {
        const updated = payload.new as any;
        if (updated?.id) {
          setDbProfiles(prev => ({
            ...prev,
            [updated.id]: {
              id: updated.id,
              is_online: updated.is_online,
              last_seen: updated.last_seen,
              full_name: updated.full_name,
              profile_picture_url: updated.profile_picture_url,
            }
          }));
        }
      })
      .subscribe();

    // Screenshot Detection - Real implementation
    // In production, use: import ScreenshotDetector from 'react-native-screenshot-detector';
    const handleScreenshotDetected = async () => {
        if (user && eventId) {
            try {
                await logScreenshot(eventId);
                setShowScreenshotWarning(true);
                setLastScreenshotUser(user.id);
                setTimeout(() => setShowScreenshotWarning(false), 3000);
            } catch (error) {
                console.error('Screenshot logging failed:', error);
            }
        }
    };

    // Presence (Online/Offline) Listener — updates DB is_online on app state change
    const appStateSub = AppState.addEventListener('change', nextAppState => {
        if (nextAppState === 'active') {
            updateUserStatus(true);
            // Re-track as active in channel too
            if (user?.id) {
              trackPresence(channel, user.id, {
                full_name: profile?.full_name || 'You',
                profile_picture_url: profile?.profile_picture_url || undefined,
              }, 'active');
            }
        } else if (nextAppState.match(/inactive|background/)) {
            updateUserStatus(false);
        }
    });

    // Set initial online status
    updateUserStatus(true);

    // Subscribe to DB-backed Typing Status
    const typingSub = subscribeToTypingStatus(eventId, (users) => {
        // Exclude current user from typers list
        if (user?.id) {
            setDbTypingUsers(users.filter(u => u.user_id !== user.id));
        }
    });

    return () => {
      msgSub.unsubscribe();
      voteSub.unsubscribe();
      presenceSub.unsubscribe();
      channel.unsubscribe();
      appStateSub.remove();
      typingSub.unsubscribe();
      updateUserStatus(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [eventId]);

  const fetchCheckInCount = async () => {
    const count = await getCheckInCount(eventId!);
    setCheckInCount(count);
    if (user?.id) {
        const isCheckedIn = await checkIfUserCheckedIn(eventId!, user.id);
        if (isCheckedIn) setHasArrived(true);
    }
  };

  const handleTyping = () => {
    // DB-backed Status only
    updateTypingStatus(eventId!, true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(eventId!, false);
    }, 2000);
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // 🚀 Trigger sending of any overdue scheduled messages
      await flushScheduledMessages(eventId!);

      const [msgs, fetchedPolls, localDeletions] = await Promise.all([
        getMessages(eventId!),
        getPolls(eventId!),
        AsyncStorage.getItem(`deleted_messages_${eventId}`)
      ]);
      
      if (msgs && msgs.length > 0) {
        setMessages(msgs);
        setPinnedMessages(msgs.filter(m => m.is_pinned));
        
        // ✅ FIX: Handle "pending" messages from previous session
        // If a message is stuck in 'pending', start/resume the confirmation timer.
        const currentUserId = user?.id;
        if (currentUserId) {
            msgs.forEach(msg => {
                if (msg.status === 'pending' && msg.sender_id === currentUserId) {
                    const createdAt = new Date(msg.created_at).getTime();
                    const now = Date.now();
                    const elapsed = now - createdAt;
                    const remaining = Math.max(0, 10000 - elapsed);

                    if (remaining === 0) {
                        // Already older than 10s, confirm immediately
                        confirmMessageSent(msg.id).catch(console.error);
                    } else {
                        // Resume timer
                        const timer = setTimeout(async () => {
                            try {
                                await confirmMessageSent(msg.id);
                                setPendingMessages(prev => {
                                    const next = {...prev};
                                    delete next[msg.id];
                                    return next;
                                });
                                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'sent' } : m));
                            } catch (e) {
                                console.error("Auto-confirm failed", e);
                            }
                        }, remaining);
                        setPendingMessages(prev => ({ ...prev, [msg.id]: timer }));
                    }
                }
            });
        }

        // Fetch DB-backed presence status for all unique senders
        const senderIds = [...new Set(msgs.map(m => m.sender_id).filter(id => id !== 'system'))];
        if (senderIds.length > 0) {
          const dbPresence = await getDbPresenceStatus(senderIds);
          setDbProfiles(dbPresence);
        }
      } else {
        setMessages([]);
        setPinnedMessages([]);
      }
      
      setPolls(fetchedPolls);
      fetchCheckInCount();
      
      if (localDeletions) {
        setDeletedMessageIds(JSON.parse(localDeletions));
      }
    } catch (error) {
      console.error("Error loading chat:", error);
    } finally {
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 200);
    }
  };

  const fetchPolls = async () => {
    try {
      const fetchedPolls = await getPolls(eventId!);
      setPolls(fetchedPolls);
    } catch (error) {
      console.error("Error syncing polls", error);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isSpamBlocked) return;
    
    // Spam Control Logic
    const now = Date.now();
    if (now - lastMessageTimeRef.current < 2000) { // Simple interval check
      setSpamCount(prev => prev + 1);
      if (spamCount >= 4) {
        setIsSpamBlocked(true);
        setTimeout(() => {
          setIsSpamBlocked(false);
          setSpamCount(0);
        }, 10000); // 10s cooldown
        return;
      }
    } else {
      setSpamCount(0);
    }
    lastMessageTimeRef.current = now;

    const text = inputText.trim();
    setInputText("");
    
    try {
      if (scheduledDate) {
         await scheduleMessage(eventId!, text, scheduledDate, isAnonymousMode);
         Alert.alert("Scheduled", `Message scheduled for ${scheduledDate.toLocaleTimeString()}`);
         // Removed client-side setTimeout processing for scheduled messages. Let the backend handle it.
         setScheduledDate(null);
         return;
      }

      const msg = await sendMessage(eventId!, text, undefined, undefined, isAnonymousMode, 'pending');
      if (msg) {
        setMessages(prev => [...prev, msg]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        const timer = setTimeout(async () => {
          try {
             await confirmMessageSent(msg.id);
             
             setPendingMessages(prev => {
               const next = {...prev};
               delete next[msg.id];
               return next;
             });
             setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'sent' } : m));
          } catch(e) {
             console.error("Failed to confirm message", e);
          }
        }, 10000); // 10s
        
        setPendingMessages(prev => ({ ...prev, [msg.id]: timer }));
      }
    } catch (error) {
      Alert.alert("Error", "Failed to send message.");
      setInputText(text);
    }
  };

  const handleUndoMessage = async (messageId: string) => {
    // 1. Clear the timer immediately so it doesn't confirm the message
    if (pendingMessages[messageId]) {
      clearTimeout(pendingMessages[messageId]);
    }
    
    // 2. Optimistic UI: remove from local state immediately
    setPendingMessages(prev => {
      const next = {...prev};
      delete next[messageId];
      return next;
    });
    setMessages(prev => prev.filter(m => m.id !== messageId));

    // 3. Inform backend in background (don't block UI)
    try {
      await cancelPendingMessage(messageId);
    } catch (e) {
      console.warn("Undo: Failed to cancel in backend", e);
    }
  };

  const handlePin = async () => {
    if (!selectedMessage) return;
    const msgId = selectedMessage.id;
    const newPinnedStatus = !selectedMessage.is_pinned;
    
    // Optimistic UI
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_pinned: newPinnedStatus } : m));
    if (newPinnedStatus) {
        setPinnedMessages(prev => [...prev, { ...selectedMessage, is_pinned: true }]);
    } else {
        setPinnedMessages(prev => prev.filter(m => m.id !== msgId));
    }

    try {
      await pinMessage(msgId, newPinnedStatus);
      setDeleteModalVisible(false);
      setSelectedMessage(null);
    } catch (error) {
      Alert.alert("Error", "Failed to update pinned status.");
      loadInitialData(); // Revert on error
    }
  };

  const handleArrived = async () => {
    try {
      if (!user?.id) return;
      setHasArrived(true);
      await checkInToEvent(eventId!, user.id);
      fetchCheckInCount();
    } catch (error) {
      setHasArrived(false);
      Alert.alert("Error", "Failed to check in.");
    }
  };

  const closeEvent = async () => {
    const summary = await getEventSummary(eventId!);
    setEventSummary(summary);
    setIsEventClosed(true);
  };

  const handleDeleteForMe = async () => {
    if (!selectedMessage) return;
    const newDeletedIds = [...deletedMessageIds, selectedMessage.id];
    setDeletedMessageIds(newDeletedIds);
    await AsyncStorage.setItem(`deleted_messages_${eventId}`, JSON.stringify(newDeletedIds));
    setDeleteModalVisible(false);
    setSelectedMessage(null);
  };

  const handleDeleteForEveryone = async () => {
    if (!selectedMessage) return;
    const msgId = selectedMessage.id;
    
    // Optimistic UI
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: "[[DELETED]]", media_url: null } : m));

    try {
      await deleteMessageForEveryone(msgId);
      setDeleteModalVisible(false);
      setSelectedMessage(null);
    } catch (error) {
      Alert.alert("Error", "Failed to delete message for everyone.");
      loadInitialData(); // Revert on error
    }
  };

  // Attachment Menu State
  const handleCreatePoll = async () => {
    if (!pollQuestion.trim() || pollOptions.some(opt => !opt.trim())) {
      Alert.alert("Invalid Poll", "Please fill in the question and all options.");
      return;
    }
    try {
      // createPoll no longer sends a message internally — we send ONE message here
      const poll = await createPoll(eventId!, pollQuestion, pollOptions.filter(o => o.trim()));
      setPollModalVisible(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
      // Refresh polls so it's ready before the message renders
      await fetchPolls();
      // Send exactly ONE poll token message
      const msg = await sendMessage(eventId!, `[[POLL:${poll.id}]]`);
      if (msg) {
        setMessages(prev => [...prev, msg]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to create poll.");
    }
  };

  const handleVote = async (optionId: string, pollId: string) => {
    try {
      await voteInPoll(optionId, pollId);
      // Optimistically fetch polls
      await fetchPolls();
    } catch (error) {
      Alert.alert("Error", "Failed to record vote.");
    }
  };

  const handleToggleLocation = async () => {
    setAttachModalVisible(false);
    if (showLocation) {
        setShowLocation(false);
        return;
    }

    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Permission to access location was denied');
      return;
    }

    setShowLocation(true);
    try {
      let location = await Location.getCurrentPositionAsync({});
      const metadata: MessageMetadata = {
          type: 'location',
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
      };
      
      const msg = await sendMessage(eventId!, "📍 Live Location", undefined, metadata);
      if (msg) {
        setMessages(prev => [...prev, msg]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (err) {
      Alert.alert("Error", "Could not fetch location.");
    }
  };

  const handleSendMedia = async (source: 'gallery' | 'camera') => {
    setAttachModalVisible(false);
    
    const permissionResult = source === 'camera' 
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
      
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", `You've refused to allow this app to access your ${source}!`);
      return;
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.7,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.7,
        });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setUploadProgress(true);
      const asset = result.assets[0];
      try {
        const mimeType = asset.type === 'video' ? 'video/mp4' : 'image/jpeg';
        
        // Upload to storage + insert into media table (returns { id, file_url, permission_type, expires_at })
        const mediaRecord = await uploadChatMedia(eventId!, asset.uri, mimeType, selectedPermission);
        
        const metadata: MessageMetadata = {
            type: asset.type === 'video' ? 'video' : 'image',
            permission_type: selectedPermission,
            expires_at: mediaRecord.expires_at,
            // Store the media.id so requestMediaAccess works correctly
            pollId: mediaRecord.id, // reusing pollId field as mediaRecordId
        };
        
        const msg = await sendMessage(eventId!, "📎 Media Attachment", mediaRecord.file_url, metadata);
        if (msg) {
          setMessages(prev => [...prev, msg]);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      } catch (err) {
        Alert.alert("Upload Failed", "Could not upload media.");
      } finally {
        setUploadProgress(false);
      }
    }
  };

  // mediaRecordId comes from message metadata.pollId (we store media.id there)
  const handleRequestAccess = async (mediaRecordId: string) => {
    if (!mediaRecordId) return;
    try {
        await requestMediaAccess(mediaRecordId);
        Alert.alert("Request Sent", "The media owner will review your access request.");
    } catch (err) {
        Alert.alert("Error", "Failed to request access.");
    }
  };

  const renderPollCard = (pollId: string, timestamp: string) => {
    const poll = polls.find(p => p.id === pollId);
    if (!poll) {
      return (
        <View style={styles.pollCard}>
          <ActivityIndicator color="#818CF8" />
        </View>
      );
    }
    
    const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0);
    const userVoted = poll.options.some(opt => opt.votes?.some(v => v.user_id === user?.id));
    
    return (
      <View style={styles.pollCard}>
        <View style={styles.pollHeader}>
          <BarChart2 size={16} color="#818CF8" style={{ marginRight: 6 }} />
          <Text style={styles.pollTitle}>Poll</Text>
        </View>
        <Text style={styles.pollQuestion}>{poll.question}</Text>
        
        <View style={styles.pollOptionsContainer}>
          {poll.options.map(opt => {
            const votesForOption = opt.votes?.length || 0;
            const percentage = totalVotes > 0 ? Math.round((votesForOption / totalVotes) * 100) : 0;
            const isMyVote = opt.votes?.some(v => v.user_id === user?.id);
            
            if (userVoted) {
              // Post-voting State
              return (
                <View key={opt.id} style={[styles.pollResultItem, isMyVote && styles.myPollResult]}>
                  <View style={[styles.pollProgress, { width: `${percentage}%` }, isMyVote && styles.myPollProgress]} />
                  <View style={styles.pollResultContent}>
                    <Text style={[styles.pollOptionText, isMyVote && styles.myPollOptionText]} numberOfLines={2}>
                      {opt.option_text}
                    </Text>
                    <View style={styles.pollStats}>
                      {isMyVote && <Text style={styles.myVoteCheck}>✓</Text>}
                      <Text style={[styles.pollPercentage, isMyVote && styles.myPollPercentage]}>
                        {percentage}%
                      </Text>
                    </View>
                  </View>
                </View>
              );
            }
            
            // Pre-voting State
            return (
              <TouchableOpacity 
                key={opt.id} 
                style={styles.pollActionItem} 
                onPress={() => handleVote(opt.id, poll.id)}
                activeOpacity={0.7}
              >
                <View style={styles.pollRadio} />
                <Text style={styles.pollOptionText}>{opt.option_text}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        
        <View style={styles.pollFooter}>
          <Text style={styles.pollFooterText}>
            {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
          </Text>
          <Text style={styles.pollFooterTime}>
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    // Hide if locally deleted
    if (deletedMessageIds.includes(item.id)) return null;

    const isMe = item.sender_id === user?.id;
    const isSystem = item.sender_id === 'system';
    const isDeletedGlobally = item.content === "[[DELETED]]";
    
    // Grouping Logic
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
    
    const isFirstInDay = !prevMessage || new Date(item.created_at).toDateString() !== new Date(prevMessage.created_at).toDateString();
    const isFirstInGroup = !prevMessage || prevMessage.sender_id !== item.sender_id || isFirstInDay;
    const isContinued = nextMessage && nextMessage.sender_id === item.sender_id && new Date(nextMessage.created_at).toDateString() === new Date(item.created_at).toDateString();

    if (isSystem) {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={styles.systemMessageText}>{item.content}</Text>
        </View>
      );
    }

    const renderDateSeparator = () => {
      if (!isFirstInDay) return null;
      return (
        <View style={styles.dateSeparator}>
          <Text style={styles.dateSeparatorText}>{getDateLabel(item.created_at)}</Text>
        </View>
      );
    };

    if (item.id === 'event-summary' && isEventClosed && eventSummary) {
      return (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Event Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Participants</Text>
            <Text style={styles.summaryValue}>{eventSummary.uniqueParticipants}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Messages</Text>
            <Text style={styles.summaryValue}>{eventSummary.totalMessages}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Status</Text>
            <Text style={[styles.summaryValue, { color: '#34D399' }]}>{eventSummary.status}</Text>
          </View>
        </View>
      );
    }
    
    // Check if the message is a Poll Token
    if (item.content.startsWith("[[POLL:") && item.content.endsWith("]]")) {
      const pId = item.content.replace("[[POLL:", "").replace("]]", "");
      return (
        <View key={item.id}>
          {renderDateSeparator()}
          <TouchableOpacity
            onLongPress={() => {
              setSelectedMessage(item);
              setDeleteModalVisible(true);
            }}
            activeOpacity={0.9}
            style={[styles.messageOuter, isMe ? styles.myMessageOuter : styles.theirMessageOuter]}
          >
            {!isMe && (
              <View style={styles.avatarSpace}>
                {isFirstInGroup && (
                  <View style={[
                    styles.avatarContainer,
                    getPresenceStyle(item.sender_id, presenceState, dbProfiles)
                  ]}>
                    <RNImage 
                      source={{ uri: item.is_anonymous 
                        ? 'https://ui-avatars.com/api/?name=Anonymous&background=random' 
                        : (item.profiles?.profile_picture_url || `https://i.pravatar.cc/80?u=${item.sender_id}`) 
                      }} 
                      style={styles.avatar} 
                    />
                  </View>
                )}
              </View>
            )}
            {renderPollCard(pId, item.created_at)}
          </TouchableOpacity>
        </View>
      );
    }
    
    const parsed = parseMessageContent(item.content);

    return (
      <View key={item.id}>
        {renderDateSeparator()}
        <TouchableOpacity
          onLongPress={() => {
            if (!isDeletedGlobally) {
              setSelectedMessage(item);
              setDeleteModalVisible(true);
            }
          }}
          activeOpacity={0.9}
          style={[
            styles.messageOuter, 
            isMe ? styles.myMessageOuter : styles.theirMessageOuter,
            !isContinued && styles.messageLastInGroup
          ]}
        >
          {!isMe && (
            <View style={styles.avatarSpace}>
              {isFirstInGroup && (
                <View style={[
                  styles.avatarContainer,
                  getPresenceStyle(item.sender_id, presenceState, dbProfiles)
                ]}>
                  <RNImage 
                    source={{ uri: item.is_anonymous 
                      ? 'https://ui-avatars.com/api/?name=Anonymous&background=random' 
                      : (item.profiles?.profile_picture_url || `https://i.pravatar.cc/80?u=${item.sender_id}`) 
                    }} 
                    style={styles.avatar} 
                  />
                </View>
              )}
            </View>
          )}
          <View style={[
            styles.messageBubble, 
            isMe ? styles.myBubble : styles.theirBubble,
            isDeletedGlobally && styles.deletedBubble,
            !isFirstInGroup && isMe && styles.myBubbleContinued,
            !isFirstInGroup && !isMe && styles.theirBubbleContinued,
            item.status === 'pending' && { opacity: 0.7 }
          ]}>
            {!isDeletedGlobally && isFirstInGroup && (
              <Text style={[styles.senderName, isMe && styles.mySenderName]}>
                {item.is_anonymous ? "🕶️ Anonymous" : (isMe ? "You" : (item.profiles?.full_name || "Participant"))}
              </Text>
            )}
            
            {/* Privacy Badges */}
            {!isDeletedGlobally && parsed.type !== 'text' && parsed.metadata?.permission_type && (
                <View style={styles.privacyBadgeContainer}>
                    {parsed.metadata.permission_type === 'view_only' && (
                        <View style={[styles.privacyBadge, styles.viewOnlyBadge]}>
                            <EyeOff size={10} color="#F87171" />
                            <Text style={styles.privacyBadgeText}>View Only (24h)</Text>
                        </View>
                    )}
                    {parsed.metadata.permission_type === 'request' && (
                        <View style={[styles.privacyBadge, styles.requestBadge]}>
                            <Lock size={10} color="#FBBF24" />
                            <Text style={styles.privacyBadgeText}>Protected</Text>
                        </View>
                    )}
                </View>
            )}

            <View style={styles.bubbleContent}>
              {!isDeletedGlobally && parsed.type === 'image' && item.media_url && (
                <View>
                    {parsed.metadata?.permission_type === 'request' && !isMe ? (
                        <TouchableOpacity 
                            style={styles.restrictedMediaContainer}
                            onPress={() => handleRequestAccess(item.id)}
                        >
                            <RNImage source={{ uri: item.media_url }} style={[styles.mediaImage, { opacity: 0.1 }]} blurRadius={20} />
                            <View style={styles.restrictOverlay}>
                                <Lock size={32} color="#FFF" />
                                <Text style={styles.restrictTitle}>Sensitive Content</Text>
                                <Text style={styles.restrictSubtitle}>Request access to view this media</Text>
                                <View style={styles.requestActionBtn}>
                                    <Text style={styles.requestActionText}>Request Access</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <View>
                            <RNImage source={{ uri: item.media_url }} style={styles.mediaImage} />
                            {parsed.metadata?.permission_type === 'view_only' && (
                                <View style={styles.viewOnlyOverlay}>
                                    <ShieldAlert size={14} color="#FFF" />
                                    <Text style={styles.viewOnlyText}>Protected: Downloads Disabled</Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>
              )}
              {!isDeletedGlobally && parsed.type === 'video' && item.media_url && (
                <View style={[styles.mediaImage, styles.videoContainer]}>
                  {parsed.metadata?.permission_type === 'request' && !isMe ? (
                      <TouchableOpacity 
                          style={styles.restrictOverlay}
                          onPress={() => handleRequestAccess(item.id)}
                      >
                          <Lock size={32} color="#FFF" />
                          <Text style={styles.restrictTitle}>Restricted Video</Text>
                          <View style={styles.requestActionBtn}>
                              <Text style={styles.requestActionText}>Request Access</Text>
                          </View>
                      </TouchableOpacity>
                  ) : (
                      <View style={StyleSheet.absoluteFill}>
                        <RNImage source={{ uri: item.media_url }} style={StyleSheet.absoluteFill} blurRadius={parsed.metadata?.permission_type === 'view_only' ? 2 : 0} />
                        <View style={styles.playIconContainer}>
                            <Text style={{color: '#FFF', fontSize: 24, paddingLeft: 4}}>▶</Text>
                        </View>
                      </View>
                  )}
                </View>
              )}
              {!isDeletedGlobally && parsed.type === 'location' && parsed.metadata && (
                <View style={styles.locationContainer}>
                  <MapPin size={24} color="#EF4444" style={{ marginBottom: 4 }} />
                  <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText]}>Live Location</Text>
                  <Text style={styles.locationCoords}>Lat: {parsed.metadata.latitude?.toFixed(4)}, Lng: {parsed.metadata.longitude?.toFixed(4)}</Text>
                </View>
              )}
              {parsed.text ? (
              <Text style={[
                styles.messageText, 
                isMe ? styles.myText : styles.theirText,
                isDeletedGlobally && styles.deletedText,
                (parsed.type !== 'text') && { marginTop: 4, fontStyle: 'italic', fontSize: 13 }
              ]}>
                {isDeletedGlobally ? "🚫 This message was deleted" : parsed.text}
              </Text>
              ) : null}
              <View style={styles.messageFooter}>
                {item.status === 'pending' && isMe ? (
                  <View style={styles.undoContainer}>
                    <Text style={styles.pendingText}>⏳ Sending in 10s...</Text>
                    <TouchableOpacity 
                      onPress={() => handleUndoMessage(item.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                       <Text style={styles.undoText}>UNDO</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <Text style={[styles.timestamp, isMe ? styles.myTime : styles.theirTime]}>
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {isMe && (
                      <View style={styles.ticksContainer}>
                        <Text style={[
                          styles.tick, 
                          item.status === 'seen' ? styles.seenTick : styles.deliveredTick
                        ]}>
                          {item.status === 'sent' ? '✓' : '✓✓'}
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            </View>
          </View>
          {isMe && (
            <View style={styles.avatarSpaceRight}>
              {isFirstInGroup && (
                <View style={[styles.avatarContainer, styles.avatarActive]}>
                  <RNImage 
                    source={{ uri: item.is_anonymous 
                      ? 'https://ui-avatars.com/api/?name=Anonymous&background=random' 
                      : (profile?.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.profiles?.full_name || 'User')}`) 
                    }} 
                    style={styles.avatar} 
                  />
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>Start the conversation!</Text>
      <View style={styles.icebreakerContainer}>
        {ICEBREAKERS.map((text, idx) => (
          <TouchableOpacity 
            key={idx} 
            style={styles.icebreaker}
            onPress={() => { setInputText(text); handleSend(); }}
          >
            <Text style={styles.icebreakerText}>{text}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const canDeleteForEveryone = selectedMessage && 
                               selectedMessage.sender_id === user?.id &&
                               (Date.now() - new Date(selectedMessage.created_at).getTime()) < DELETE_TIME_LIMIT_MS;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <ChevronLeft size={24} color="#64748B" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle}>Event Chat</Text>
            {/* Status Indicator: green if anyone active in channel, yellow if in app only, red if all offline */}
            <View style={[
                styles.statusDot, 
                Object.values(presenceState).some(p => p.user_id !== user?.id && p.status === 'active')
                  ? styles.onlineDot
                  : Object.values(dbProfiles).some(p => p.id !== user?.id && p.is_online)
                  ? styles.idleDot
                  : styles.offlineDot 
            ]} />
          </View>
          <View style={styles.headerSubRow}>
            <View style={styles.phasePill}>
              <Clock size={10} color="#34D399" />
              <Text style={styles.phaseText}>PLANNING</Text>
            </View>
            <Text style={styles.participantCount}>
              • {Object.keys(presenceState).length} online
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={closeEvent}>
          <MoreVertical size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* Check-In Bar */}
      <View style={styles.checkInBar}>
        <View style={styles.checkInInfo}>
          <CheckCircle2 size={16} color="#34D399" />
          <Text style={styles.checkInText}>{checkInCount} participants arrived</Text>
        </View>
        {!hasArrived && (
          <TouchableOpacity style={styles.arrivedBtn} onPress={handleArrived}>
            <Text style={styles.arrivedBtnText}>I Arrived ✅</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Pinned Messages Banner */}
      {pinnedMessages.length > 0 && (
        <View style={styles.pinnedBanner}>
          <Pin size={14} color="#818CF8" style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.pinnedTitle}>Pinned</Text>
            <Text style={styles.pinnedContent} numberOfLines={1}>
              {pinnedMessages[0].content.startsWith('[[') ? 'Media/Poll' : pinnedMessages[0].content}
            </Text>
          </View>
          <TouchableOpacity onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}>
            <Info size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      )}

      {/* Screenshot Warning Banner */}
      {showScreenshotWarning && (
        <View style={styles.screenshotWarning}>
          <ShieldAlert size={16} color="#FFF" />
          <Text style={styles.screenshotWarningText}>
            {lastScreenshotUser} took a screenshot! Privacy log updated.
          </Text>
        </View>
      )}

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#818CF8" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            style={{ flex: 1 }}
            data={isEventClosed ? [...messages, { id: 'event-summary' } as any] : messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmpty}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
          />
        )}

      {/* Deletion Context Menu Modal */}
      <Modal visible={isDeleteModalVisible} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setDeleteModalVisible(false)}
        >
          <View style={styles.deleteMenu}>
            <Text style={styles.deleteMenuTitle}>Message Options</Text>
            
            <TouchableOpacity style={styles.deleteOption} onPress={handleDeleteForMe}>
              <Trash2 size={20} color="#CBD5E1" style={{ marginRight: 12 }} />
              <Text style={styles.deleteOptionText}>Delete for me</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteOption} onPress={handlePin}>
              <Pin size={20} color="#818CF8" style={{ marginRight: 12 }} />
              <Text style={styles.deleteOptionText}>
                {selectedMessage?.is_pinned ? "Unpin Message" : "Pin Message"}
              </Text>
            </TouchableOpacity>

            {canDeleteForEveryone && (
              <TouchableOpacity style={styles.deleteOption} onPress={handleDeleteForEveryone}>
                <Trash2 size={20} color="#EF4444" style={{ marginRight: 12 }} />
                <Text style={[styles.deleteOptionText, { color: "#EF4444" }]}>Delete for everyone</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.deleteOption, { borderBottomWidth: 0, marginTop: 8 }]} 
              onPress={() => setDeleteModalVisible(false)}
            >
              <Text style={[styles.deleteOptionText, { color: "#94A3B8", textAlign: 'center', width: '100%' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Attachment Options Modal */}
      <Modal visible={isAttachModalVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.attachOverlay} onPress={() => setAttachModalVisible(false)} activeOpacity={1}>
          <View style={styles.attachMenu}>
            <Text style={styles.attachMenuTitle}>Share Submissions</Text>
            
            {/* Permission Selector */}
            <View style={styles.permissionSelector}>
                <Text style={styles.permissionLabel}>Media Privacy:</Text>
                <View style={styles.permissionOptions}>
                    {(['allow', 'view_only', 'request'] as const).map((p) => (
                        <TouchableOpacity 
                            key={p} 
                            style={[styles.permissionOption, selectedPermission === p && styles.permissionOptionActive]}
                            onPress={() => setSelectedPermission(p)}
                        >
                            <Text style={[styles.permissionOptionText, selectedPermission === p && styles.permissionOptionTextActive]}>
                                {p.replace('_', ' ').toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <Text style={styles.permissionHint}>
                    {selectedPermission === 'view_only' && "⚠️ Recipient cannot download. Expires in 24h."}
                    {selectedPermission === 'request' && "🔒 Recipient must request access to view."}
                    {selectedPermission === 'allow' && "✅ Full access for participants."}
                </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
              <TouchableOpacity style={styles.attachOptionSquare} onPress={() => handleSendMedia('camera')}>
                <View style={[styles.attachIconBg, { backgroundColor: '#F87171' }]}>
                  <Camera size={24} color="#FFF" />
                </View>
                <Text style={styles.attachOptionTextSmall}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.attachOptionSquare} onPress={() => handleSendMedia('gallery')}>
                <View style={[styles.attachIconBg, { backgroundColor: '#3B82F6' }]}>
                  <Paperclip size={24} color="#FFF" />
                </View>
                <Text style={styles.attachOptionTextSmall}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.attachOptionSquare} onPress={handleToggleLocation}>
                <View style={[styles.attachIconBg, { backgroundColor: '#10B981' }]}>
                  <MapPin size={24} color="#FFF" />
                </View>
                <Text style={styles.attachOptionTextSmall}>Location</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.attachOptionSquare} onPress={() => { setAttachModalVisible(false); setPollModalVisible(true); }}>
                <View style={[styles.attachIconBg, { backgroundColor: '#8B5CF6' }]}>
                  <BarChart2 size={24} color="#FFF" />
                </View>
                <Text style={styles.attachOptionTextSmall}>Poll</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

        {isSpamBlocked && (
          <View style={styles.spamWarning}>
            <AlertTriangle size={14} color="#F59E0B" style={{ marginRight: 8 }} />
            <Text style={styles.spamWarningText}>You're sending messages too fast. Please slow down.</Text>
          </View>
        )}

        {dbTypingUsers.length > 0 && (
          <View style={styles.typingArea}>
            <View style={styles.typingIndicatorContainer}>
                <View style={styles.typingBubbles}>
                    <View style={[styles.typingDot, { opacity: 0.4 }]} />
                    <View style={[styles.typingDot, { opacity: 0.7 }]} />
                    <View style={[styles.typingDot, { opacity: 1 }]} />
                </View>
                <Text style={styles.typingText}>
                {dbTypingUsers.length === 1 
                    ? `${dbTypingUsers[0].full_name} is typing...`
                    : `${dbTypingUsers[0].full_name} and ${dbTypingUsers.length - 1} others are typing...`}
                </Text>
            </View>
          </View>
        )}

        <View style={styles.inputArea}>
          {/* Advanced Features Toggles */}
          <View style={styles.advancedFeaturesRow}>
             <TouchableOpacity 
               style={[styles.featureToggle, isAnonymousMode && styles.featureToggleActive]}
               onPress={() => setIsAnonymousMode(!isAnonymousMode)}
             >
               <UserMinus size={14} color={isAnonymousMode ? "#FFF" : "#94A3B8"} />
               <Text style={[styles.featureToggleText, isAnonymousMode && styles.featureToggleTextActive]}>
                 Anonymous: {isAnonymousMode ? "ON" : "OFF"}
               </Text>
             </TouchableOpacity>

             <TouchableOpacity 
               style={[styles.featureToggle, scheduledDate && styles.featureToggleActive]}
               onPress={() => setDatePickerVisible(true)}
             >
               <Calendar size={14} color={scheduledDate ? "#FFF" : "#94A3B8"} />
               <Text style={[styles.featureToggleText, scheduledDate && styles.featureToggleTextActive]}>
                 {scheduledDate ? scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Schedule"}
               </Text>
               {scheduledDate && (
                 <TouchableOpacity onPress={() => setScheduledDate(null)} style={{ marginLeft: 4 }}>
                   <X size={12} color="#FFF" />
                 </TouchableOpacity>
               )}
             </TouchableOpacity>
          </View>

          {isDatePickerVisible && (
            <DateTimePicker
              value={scheduledDate || new Date()}
              mode="time"
              display="default"
              onChange={(event, date) => {
                setDatePickerVisible(false);
                if (date) setScheduledDate(date);
              }}
            />
          )}

          {uploadProgress && (
            <View style={styles.uploadProgressContainer}>
              <ActivityIndicator color="#818CF8" size="small" style={{ marginRight: 8 }} />
              <Text style={styles.uploadProgressText}>Uploading media...</Text>
            </View>
          )}
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.attachBtn} onPress={() => setAttachModalVisible(true)}>
              <Paperclip size={22} color="#94A3B8" />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#475569"
              value={inputText}
              onChangeText={(text) => {
                setInputText(text);
                handleTyping();
                resetIdleTimerRef.current?.();
              }}
              multiline
            />
            <TouchableOpacity 
              style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]} 
              onPress={handleSend}
              disabled={!inputText.trim()}
            >
              <Send size={18} color={!inputText.trim() ? "#475569" : "#0F172A"} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={isPollModalVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior="padding">
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create Poll</Text>
                <TouchableOpacity onPress={() => setPollModalVisible(false)}>
                  <X size={24} color="#CBD5E1" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.modalInput}
                placeholder="Poll Question"
                placeholderTextColor="#475569"
                value={pollQuestion}
                onChangeText={setPollQuestion}
              />
              {pollOptions.map((opt, i) => (
                <TextInput
                  key={i}
                  style={styles.modalInput}
                  placeholder={`Option ${i + 1}`}
                  placeholderTextColor="#475569"
                  value={opt}
                  onChangeText={(val) => {
                    const newOpts = [...pollOptions];
                    newOpts[i] = val;
                    setPollOptions(newOpts);
                  }}
                />
              ))}
              <TouchableOpacity 
                style={styles.addOptionBtn}
                onPress={() => setPollOptions([...pollOptions, ""])}
              >
                <Text style={styles.addOptionText}>+ Add Option</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createPollBtn} onPress={handleCreatePoll}>
                <Text style={styles.createPollBtnText}>Create Poll</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function getDateLabel(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

/**
 * Returns the correct avatar border style based on 3-state presence:
 * - 'active' in channel  → green (🟢 in chat AND in app)
 * - in dbProfiles as online but NOT in channel → yellow (🟡 in app, not in chat)
 * - offline everywhere → red (🔴)
 */
function getPresenceStyle(
  userId: string,
  presenceState: Record<string, any>,
  dbProfiles: Record<string, any>
) {
  const channelStatus = presenceState[userId]?.status;
  if (channelStatus === 'active') return styles.avatarActive;
  if (channelStatus === 'idle') return styles.avatarIdle;
  // Fallback to DB is_online
  if (dbProfiles[userId]?.is_online === true) return styles.avatarIdle; // yellow = in app but not in chat
  return styles.avatarOffline;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#020617",
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)",
  },
  headerBtn: {
    width: 40, height: 40, alignItems: "center", justifyContent: "center",
    borderRadius: 12, backgroundColor: "rgba(255,255,255,0.03)",
  },
  headerTitleContainer: { alignItems: "center", flex: 1 },
  headerTopRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#F1F5F9" },
  headerSubRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  participantCount: { fontSize: 10, color: "#64748B", fontWeight: "600" },
  phasePill: {
    flexDirection: "row", alignItems: "center", backgroundColor: "rgba(52,211,153,0.1)",
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, gap: 4,
  },
  phaseText: { fontSize: 9, fontWeight: "800", color: "#34D399", letterSpacing: 0.5 },
  listContent: { padding: 16, paddingBottom: 40 },
  dateSeparator: { 
    alignSelf: 'center', 
    marginVertical: 24, 
    backgroundColor: '#1E293B', 
    paddingHorizontal: 16, 
    paddingVertical: 6, 
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  dateSeparatorText: { color: '#94A3B8', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  messageOuter: { flexDirection: "row", marginBottom: 2, maxWidth: "85%" },
  myMessageOuter: { alignSelf: "flex-end" },
  theirMessageOuter: { alignSelf: "flex-start" },
  messageLastInGroup: { marginBottom: 12 },
  avatarSpace: { width: 44, marginRight: 8, alignItems: 'center', justifyContent: 'flex-end' },
  avatarSpaceRight: { width: 44, marginLeft: 8, alignItems: 'center', justifyContent: 'flex-end' },
  avatarContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    backgroundColor: '#020617',
  },
  avatarActive: {
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 5,
    elevation: 4,
  },
  avatarIdle: {
    borderColor: '#F59E0B',
  },
  avatarOffline: {
    borderColor: '#EF4444',
  },
  avatar: { width: 30, height: 30, borderRadius: 15 },
  
  // Standard Messages
  messageBubble: { 
    padding: 10, 
    paddingHorizontal: 14, 
    borderRadius: 20,
    elevation: 1, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 2,
  },
  myBubble: { 
    backgroundColor: "#818CF8", 
    borderTopRightRadius: 4,
  },
  myBubbleContinued: { borderTopRightRadius: 20 },
  theirBubble: { 
    backgroundColor: "#1E293B", 
    borderTopLeftRadius: 4, 
  },
  theirBubbleContinued: { borderTopLeftRadius: 20 },
  senderName: { fontSize: 12, fontWeight: "700", color: "#818CF8", marginBottom: 4 },
  mySenderName: { textAlign: "right", color: "#F1F5F9" },
  bubbleContent: { flexDirection: 'column' },
  messageText: { fontSize: 15, lineHeight: 22, color: "#F1F5F9" },
  myText: { color: "#FFFFFF" },
  theirText: { color: "#F1F5F9" },
  messageFooter: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginTop: 4, gap: 4 },
  timestamp: { fontSize: 10, color: "rgba(255,255,255,0.5)" },
  myTime: { color: "rgba(255,255,255,0.6)" },
  theirTime: { color: "rgba(255,255,255,0.4)" },
  ticksContainer: { marginLeft: 2 },
  tick: { fontSize: 10, fontWeight: "800" },
  deliveredTick: { color: "rgba(255,255,255,0.5)" },
  seenTick: { color: "#3B82F6" },

  systemMessageContainer: { 
    alignSelf: 'center', 
    marginVertical: 12, 
    backgroundColor: '#1E293B', 
    paddingHorizontal: 12, 
    paddingVertical: 4, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  systemMessageText: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
  
  deletedBubble: { backgroundColor: "#141B2D", opacity: 0.8, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  deletedText: { color: "#64748B", fontStyle: 'italic', fontSize: 14 },

  // Media & Location
  mediaImage: { width: 220, height: 160, borderRadius: 16, backgroundColor: "#1E293B" },
  videoContainer: { justifyContent: "center", alignItems: "center", overflow: 'hidden' },
  playIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  locationContainer: { 
    width: 220, 
    padding: 12, 
    borderRadius: 16, 
    backgroundColor: "#141B2D", 
    alignItems: "center", 
    justifyContent: "center", 
    borderWidth: 1, 
    borderColor: "rgba(255,255,255,0.05)" 
  },
  locationCoords: { fontSize: 10, color: "#94A3B8", marginTop: 4 },

  // Poll Cards
  pollCard: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    padding: 16,
    minWidth: 260,
  },
  pollHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  pollTitle: { fontSize: 12, fontWeight: "800", color: "#818CF8", textTransform: "uppercase", letterSpacing: 1 },
  pollQuestion: { fontSize: 16, fontWeight: "700", color: "#F1F5F9", marginBottom: 16 },
  pollOptionsContainer: { gap: 10 },
  pollActionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  pollRadio: {
    width: 20, height: 20, borderRadius: 10, 
    borderWidth: 2, borderColor: "#475569", marginRight: 12
  },
  pollResultItem: {
    position: "relative",
    backgroundColor: "#0F172A",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    overflow: "hidden",
  },
  myPollResult: {
    borderColor: "#818CF8",
    backgroundColor: "#141B2D",
  },
  pollProgress: {
    position: "absolute", left: 0, top: 0, bottom: 0,
    backgroundColor: "rgba(129,140,248,0.1)",
  },
  myPollProgress: {
    backgroundColor: "rgba(129,140,248,0.2)",
  },
  pollResultContent: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 12,
  },
  pollOptionText: { fontSize: 14, color: "#F1F5F9", flex: 1, fontWeight: "500" },
  myPollOptionText: { color: "#818CF8", fontWeight: "700" },
  pollStats: { flexDirection: "row", alignItems: "center", marginLeft: 12 },
  myVoteCheck: { color: "#818CF8", fontWeight: "800", marginRight: 6, fontSize: 14 },
  pollPercentage: { fontSize: 12, color: "#94A3B8", minWidth: 32, textAlign: "right", fontWeight: "600" },
  myPollPercentage: { color: "#818CF8", fontWeight: "700" },
  pollFooter: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginTop: 16, 
    borderTopWidth: 1, 
    borderTopColor: "rgba(255,255,255,0.05)", 
    paddingTop: 12 
  },
  pollFooterText: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  pollFooterTime: { fontSize: 10, color: "#475569" },

  // Delete Menu Modal
  deleteMenu: {
    backgroundColor: "#0F172A",
    borderRadius: 32,
    padding: 24,
    width: '90%',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  deleteMenuTitle: {
    color: "#F1F5F9",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 20,
    textAlign: "center",
  },
  deleteOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  deleteOptionText: {
    color: "#CBD5E1",
    fontSize: 16,
    fontWeight: "600",
  },

  // Input Area Styles
  uploadProgressContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    marginBottom: 8, 
    padding: 8, 
    backgroundColor: "rgba(129,140,248,0.1)", 
    borderRadius: 12 
  },
  uploadProgressText: { color: "#818CF8", fontSize: 13, fontWeight: "600" },

  inputArea: { 
    padding: 12, 
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
    backgroundColor: "#020617", 
    borderTopWidth: 1, 
    borderTopColor: "rgba(255,255,255,0.05)" 
  },
  inputContainer: {
    flexDirection: "row", 
    alignItems: "flex-end", 
    backgroundColor: "#1E293B",
    borderRadius: 28, 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderWidth: 1, 
    borderColor: "rgba(255,255,255,0.05)",
  },
  attachBtn: { 
    padding: 10, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  input: { 
    flex: 1, 
    color: "#F1F5F9", 
    fontSize: 16, 
    maxHeight: 120, 
    minHeight: 40,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 8,
  },
  sendBtn: {
    width: 40, 
    height: 40, 
    backgroundColor: "#818CF8", 
    borderRadius: 20,
    alignItems: "center", 
    justifyContent: "center", 
    marginLeft: 6,
    marginBottom: 2,
  },
  sendBtnDisabled: { 
    backgroundColor: "rgba(255,255,255,0.1)" 
  },

  // Attachment Menu Styles
  attachOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  attachMenu: {
    backgroundColor: "#0F172A",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  attachMenuTitle: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 24,
    textAlign: "center",
  },
  attachOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  attachIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  attachOptionText: {
    color: "#F1F5F9",
    fontSize: 16,
    fontWeight: "600",
  },
  attachOptionSquare: {
    width: 80,
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  attachOptionTextSmall: {
    color: "#F1F5F9",
    fontSize: 12,
    fontWeight: "600",
  },

  // Typing Area
  typingArea: { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: "transparent" },
  typingIndicatorContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingBubbles: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  typingDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#6366F1' },
  typingText: { fontSize: 12, color: "#6366F1", fontWeight: "600", fontStyle: "italic" },

  statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 2, borderWidth: 1.5, borderColor: '#FFFFFF' },
  onlineDot: { backgroundColor: "#10B981" },  // 🟢 Green — active in chat channel
  idleDot: { backgroundColor: "#F59E0B" },    // 🟡 Yellow — in app but not in chat
  offlineDot: { backgroundColor: "#EF4444" }, // 🔴 Red — completely offline

  // Check-In Bar
  checkInBar: { 
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#141B2D", paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)",
  },
  checkInInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkInText: { fontSize: 13, color: "#94A3B8", fontWeight: "600" },
  arrivedBtn: { 
    backgroundColor: "#10B981", 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 12,
  },
  arrivedBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },

  pinnedBanner: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#1E293B",
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)",
  },
  pinnedTitle: { fontSize: 10, fontWeight: "800", color: "#818CF8", textTransform: "uppercase" },
  pinnedContent: { fontSize: 13, color: "#94A3B8", fontWeight: "500" },


  screenshotWarning: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#EF4444",
    paddingHorizontal: 16, paddingVertical: 8, gap: 8,
  },
  screenshotWarningText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },


  // Spam Warning
  spamWarning: { 
    flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7",
    paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 12, marginBottom: 8, borderRadius: 12,
    borderWidth: 1, borderColor: "#FDE68A",
  },
  spamWarningText: { color: "#D97706", fontSize: 12, fontWeight: "600" },

  // Summary Card
  summaryCard: {
    backgroundColor: "#FFFFFF", borderRadius: 24, padding: 24, marginVertical: 20,
    borderWidth: 1, borderColor: "#E2E8F0", alignSelf: "stretch",
    elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10,
  },
  summaryTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", marginBottom: 16, textAlign: "center" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  summaryLabel: { fontSize: 14, color: "#64748B", fontWeight: "600" },
  summaryValue: { fontSize: 14, color: "#0F172A", fontWeight: "700" },

  emptyContainer: { alignItems: "center", marginTop: 40 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#64748B", marginBottom: 20 },
  icebreakerContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10 },
  icebreaker: { 
    backgroundColor: "#FFFFFF", 
    paddingHorizontal: 14, 
    paddingVertical: 10, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: "#E2E8F0",
    elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  icebreakerText: { color: "#475569", fontSize: 14, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.6)", justifyContent: "center", padding: 24 },
  modalContent: { 
    backgroundColor: "#FFFFFF", 
    borderRadius: 32, 
    padding: 24, 
    elevation: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 30,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  modalInput: {
    backgroundColor: "#F8FAFC", borderRadius: 16, padding: 16, color: "#1E293B",
    marginBottom: 16, borderWidth: 1, borderColor: "#E2E8F0",
  },
  addOptionBtn: { alignSelf: "flex-start", marginBottom: 24 },
  addOptionText: { color: "#6366F1", fontWeight: "700" },
  createPollBtn: { backgroundColor: "#6366F1", paddingVertical: 18, borderRadius: 20, alignItems: "center" },
  createPollBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },

  // Privacy Styles
  privacyBadgeContainer: { flexDirection: 'row', marginBottom: 6, gap: 4 },
  privacyBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, gap: 4 },
  viewOnlyBadge: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
  requestBadge: { backgroundColor: 'rgba(245, 158, 11, 0.2)' },
  privacyBadgeText: { fontSize: 9, fontWeight: '800', color: '#F1F5F9', textTransform: 'uppercase' },
  
  restrictedMediaContainer: { width: 220, height: 160, borderRadius: 16, overflow: 'hidden', backgroundColor: '#141B2D' },
  restrictOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2, 6, 23, 0.9)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  restrictTitle: { color: '#F1F5F9', fontSize: 16, fontWeight: '800', marginTop: 12, textAlign: 'center' },
  restrictSubtitle: { color: '#94A3B8', fontSize: 12, textAlign: 'center', marginTop: 4 },
  requestActionBtn: { backgroundColor: '#818CF8', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginTop: 16 },
  requestActionText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  
  viewOnlyOverlay: { position: 'absolute', bottom: 8, left: 8, right: 8, backgroundColor: 'rgba(2, 6, 23, 0.7)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  viewOnlyText: { color: '#FFF', fontSize: 10, fontWeight: '600' },

  permissionSelector: { marginBottom: 24, padding: 16, backgroundColor: '#141B2D', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  permissionLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '700', marginBottom: 12, textTransform: 'uppercase' },
  permissionOptions: { flexDirection: 'row', gap: 8 },
  permissionOption: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)' },
  permissionOptionActive: { backgroundColor: '#818CF8', borderColor: '#818CF8' },
  permissionOptionText: { fontSize: 10, fontWeight: '800', color: '#94A3B8' },
  permissionOptionTextActive: { color: '#FFF' },
  permissionHint: { color: '#64748B', fontSize: 11, marginTop: 10, fontStyle: 'italic' },
  
  // Undo Message Timer
  undoContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(245, 158, 11, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, marginTop: 4, width: '100%', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)' },
  pendingText: { color: '#F59E0B', fontSize: 11, fontWeight: '600', fontStyle: 'italic' },
  undoText: { color: '#EF4444', fontSize: 11, fontWeight: '800', backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },

  // Advanced Features Toggles
  advancedFeaturesRow: { flexDirection: 'row', gap: 8, marginBottom: 12, paddingHorizontal: 8 },
  featureToggle: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#141B2D', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  featureToggleActive: { backgroundColor: 'rgba(129, 140, 248, 0.15)', borderColor: '#818CF8' },
  featureToggleText: { color: '#94A3B8', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  featureToggleTextActive: { color: '#818CF8' },

});
