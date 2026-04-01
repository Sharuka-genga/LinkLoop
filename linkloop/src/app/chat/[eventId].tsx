import React, { useEffect, useState, useRef } from "react";
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  TextInput, KeyboardAvoidingView, Platform, SafeAreaView, 
  Image as RNImage, ActivityIndicator, Alert, Modal, AppState
} from "react-native";
import { 
  Send, ChevronLeft, Paperclip, BarChart2, MoreVertical, 
  Clock, MapPin, X, Trash2, Camera
} from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { 
  getMessages, sendMessage, subscribeToMessages, 
  Message, uploadChatMediaDirectly, createPoll, getPolls, Poll, voteInPoll,
  deleteMessageForEveryone, trackPresence, broadcastTyping, PresenceState,
  pinMessage, checkInToEvent, getCheckInCount, getEventSummary,
  parseMessageContent, MessageMetadata, logScreenshot, uploadChatMedia, requestMediaAccess,
  updateUserStatus, updateTypingStatus, subscribeToTypingStatus, TypingStatus,
  cancelPendingMessage, confirmMessageSent, scheduleMessage, checkIfUserCheckedIn
} from "@/lib/chat";
import { Pin, CheckCircle2, AlertTriangle, Info, EyeOff, Lock, ShieldAlert, DownloadCloud, UserMinus, Calendar } from "lucide-react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from "@/lib/supabase";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";
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

    const channel = supabase.channel(`event_chat:${eventId}`, {
      config: {
        presence: {
          key: TEST_USER_ID,
        },
      },
    });

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
        setMessages((prev) => prev.map(m => m.id === newMessage.id ? newMessage : m));
      }
    });

    // Presence & Activity Subscriptions
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const simplifiedState: Record<string, PresenceState> = {};
        Object.keys(state).forEach((key) => {
          simplifiedState[key] = state[key][0] as any as PresenceState;
        });
        setPresenceState(simplifiedState);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key !== TEST_USER_ID) {
          const name = newPresences[0]?.full_name || "Someone";
          const sysMsg: Message = {
            id: `sys-join-${Date.now()}`,
            event_id: eventId!,
            sender_id: 'system',
            content: `${name} joined the event`,
            created_at: new Date().toISOString(),
            status: 'sent'
          };
          setMessages(prev => [...prev, sysMsg]);
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        if (key !== TEST_USER_ID) {
          const name = leftPresences[0]?.full_name || "Someone";
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
        if (status === 'SUBSCRIBED') {
          await trackPresence(channel, TEST_USER_ID, { full_name: "You" }, 'active');
        }
      });

    // Idle Timer Logic
    const resetIdleTimer = () => {
      lastActiveRef.current = Date.now();
      if (currentUserStatus !== 'active') {
        setCurrentUserStatus('active');
        trackPresence(channel, TEST_USER_ID, { full_name: "You" }, 'active');
      }
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        setCurrentUserStatus('idle');
        trackPresence(channel, TEST_USER_ID, { full_name: "You" }, 'idle');
      }, 2 * 60 * 1000); // 2 minutes
    };

    resetIdleTimerRef.current = resetIdleTimer;
    resetIdleTimer();

    loadInitialData();

    const voteSub = supabase
      .channel('advanced_chat_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.eventType === 'UPDATE' && payload.new.is_pinned !== undefined) {
           loadInitialData(); // Refresh to get correct pinned state
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_checkins' }, () => {
         fetchCheckInCount();
      })
      .subscribe();

    // Screenshot Detection (Mock implementation)
    // In a real app, use: import ScreenshotDetector from 'react-native-screenshot-detector';
    const simulateScreenshot = () => {
        handleScreenshotDetected();
    };

    // For demonstration, we'll listen for a custom event or just providing the handler
    const handleScreenshotDetected = async () => {
        setLastScreenshotUser("You");
        setShowScreenshotWarning(true);
        setTimeout(() => setShowScreenshotWarning(false), 5000);
        await logScreenshot(eventId!);
    };

    // Presence (Online/Offline) Listener
    const appStateSub = AppState.addEventListener('change', nextAppState => {
        if (nextAppState === 'active') {
            updateUserStatus(true);
        } else if (nextAppState.match(/inactive|background/)) {
            updateUserStatus(false);
        }
    });

    // Set initial online status
    updateUserStatus(true);

    // Subscribe to DB-backed Typing Status
    const typingSub = subscribeToTypingStatus(eventId, (users) => {
        // Exclude current user from typers list
        setDbTypingUsers(users.filter(u => u.user_id !== TEST_USER_ID));
    });

    return () => {
      msgSub.unsubscribe();
      voteSub.unsubscribe();
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
    const isCheckedIn = await checkIfUserCheckedIn(eventId!, TEST_USER_ID);
    if (isCheckedIn) setHasArrived(true);
  };

  const handleTyping = () => {
    // Ephemeral Broadcast (Optional, keep for redundancy or remove)
    const channel = supabase.channel(`event_chat:${eventId}`);
    broadcastTyping(channel, TEST_USER_ID, "You", true);
    
    // DB-backed Status
    updateTypingStatus(eventId!, true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(channel, TEST_USER_ID, "You", false);
      updateTypingStatus(eventId!, false);
    }, 2000);
  };

  const loadInitialData = async () => {
    try {
      const [msgs, fetchedPolls, localDeletions] = await Promise.all([
        getMessages(eventId!),
        getPolls(eventId!),
        AsyncStorage.getItem(`deleted_messages_${eventId}`)
      ]);
      
      if (msgs && msgs.length > 0) {
        setMessages(msgs);
        setPinnedMessages(msgs.filter(m => m.is_pinned));
      } else {
        // Fallback to mock messages for UI verification
        const mockMsgs: Message[] = [
          {
            id: 'm1',
            event_id: eventId!,
            sender_id: 'user_1',
            content: 'Hey everyone 👋',
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(), // Yesterday
            status: 'seen',
            profiles: { full_name: 'John', avatar_url: 'https://i.pravatar.cc/150?u=john' }
          },
          {
            id: 'm2',
            event_id: eventId!,
            sender_id: 'user_1',
            content: 'Are we still meeting at 5?',
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 24.9).toISOString(),
            status: 'seen',
            profiles: { full_name: 'John', avatar_url: 'https://i.pravatar.cc/150?u=john' }
          },
          {
            id: 'm3',
            event_id: eventId!,
            sender_id: TEST_USER_ID,
            content: 'Yes! See you there.',
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // Today
            status: 'seen'
          },
          {
            id: 'm4',
            event_id: eventId!,
            sender_id: 'user_2',
            content: 'I\'ll be a bit late 😅',
            created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // Today
            status: 'delivered',
            profiles: { full_name: 'Sarah', avatar_url: 'https://i.pravatar.cc/150?u=sarah' }
          },
          {
            id: 'm5',
            event_id: eventId!,
            sender_id: 'user_2',
            content: 'Wait for me for 10 mins',
            created_at: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
            status: 'delivered',
            profiles: { full_name: 'Sarah', avatar_url: 'https://i.pravatar.cc/150?u=sarah' }
          }
        ];
        setMessages(mockMsgs);
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
         
         const delay = Math.max(0, scheduledDate.getTime() - Date.now());
          setTimeout(async () => {
             try {
                // Simulate the backend cron job / edge function processing the scheduled message
                const msg = await sendMessage(eventId!, text, undefined, undefined, isAnonymousMode, 'sent');
                if (msg) {
                   setMessages(prev => {
                      if (prev.some(m => m.id === msg.id)) return prev;
                      return [...prev, msg];
                   });
                   setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
                }
             } catch (e) {
                console.error("Failed to send scheduled message automatically", e);
             }
         }, delay);

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
    if (pendingMessages[messageId]) {
      clearTimeout(pendingMessages[messageId]);
      await cancelPendingMessage(messageId);
      
      setPendingMessages(prev => {
        const next = {...prev};
        delete next[messageId];
        return next;
      });
      
      setMessages(prev => prev.filter(m => m.id !== messageId));
    }
  };

  const handlePin = async () => {
    if (!selectedMessage) return;
    try {
      await pinMessage(selectedMessage.id, !selectedMessage.is_pinned);
      setDeleteModalVisible(false);
      setSelectedMessage(null);
      loadInitialData();
    } catch (error) {
      Alert.alert("Error", "Failed to update pinned status.");
    }
  };

  const handleArrived = async () => {
    try {
      setHasArrived(true);
      const res = await checkInToEvent(eventId!, TEST_USER_ID);
      
      if (res?.mocked) {
         setCheckInCount(prev => prev + 1);
      } else {
         fetchCheckInCount();
      }
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
    try {
      await deleteMessageForEveryone(selectedMessage.id);
      setDeleteModalVisible(false);
      setSelectedMessage(null);
    } catch (error) {
      Alert.alert("Error", "Failed to delete message for everyone.");
    }
  };

  // Attachment Menu State
  const handleCreatePoll = async () => {
    if (!pollQuestion.trim() || pollOptions.some(opt => !opt.trim())) {
      Alert.alert("Invalid Poll", "Please fill in the question and all options.");
      return;
    }
    try {
      const poll = await createPoll(eventId!, pollQuestion, pollOptions.filter(o => o.trim()));
      setPollModalVisible(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
      // Refresh polls array instantly so it's ready before the message renders
      await fetchPolls();
      await sendMessage(eventId!, `[[POLL:${poll.id}]]`);
    } catch (error) {
      Alert.alert("Error", "Failed to create poll.");
    }
  };

  const handleVote = async (optionId: string) => {
    try {
      await voteInPoll(optionId);
      // Optimistically fetch polls
      await fetchPolls();
    } catch (error) {
      Alert.alert("Error", "Already voted or failed to record vote.");
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
      if (msg && msg.id && msg.id.startsWith('mock-')) {
        setMessages(prev => [...prev, msg]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (err) {
      Alert.alert("Error", "Could not fetch location.");
    }
  };

  const handleSendMedia = async (source: 'gallery' | 'camera') => {
    setAttachModalVisible(false);
    
    // Request permissions
    const permissionResult = source === 'camera' 
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
      
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", `You've refused to allow this app to access your ${source}!`);
      return;
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All,
          allowsEditing: true,
          quality: 0.7,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All,
          allowsEditing: true,
          quality: 0.7,
        });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setUploadProgress(true);
      const asset = result.assets[0];
      try {
        const mimeType = asset.type === 'video' ? 'video/mp4' : 'image/jpeg';
        
        // Use privacy-aware upload
        const mediaRecord = await uploadChatMedia(eventId!, asset.uri, mimeType, selectedPermission);
        
        const metadata: MessageMetadata = {
            type: asset.type === 'video' ? 'video' : 'image',
            permission_type: selectedPermission,
            expires_at: mediaRecord.expires_at
        };
        
        const msg = await sendMessage(eventId!, "Media Attachment", mediaRecord.file_url, metadata);
        if (msg && msg.id && msg.id.startsWith('mock-')) {
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

  const handleRequestAccess = async (mediaId: string) => {
    try {
        await requestMediaAccess(mediaId);
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
    const userVoted = poll.options.some(opt => opt.votes?.some(v => v.user_id === TEST_USER_ID));
    
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
            const isMyVote = opt.votes?.some(v => v.user_id === TEST_USER_ID);
            
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
                onPress={() => handleVote(opt.id)}
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

    const isMe = item.sender_id === TEST_USER_ID;
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
                  <RNImage source={{ uri: `https://i.pravatar.cc/80?u=${item.sender_id}` }} style={styles.avatar} />
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
                <RNImage 
                  source={{ uri: item.is_anonymous ? 'https://ui-avatars.com/api/?name=Anonymous&background=random' : (item.profiles?.avatar_url || `https://i.pravatar.cc/80?u=${item.sender_id}`) }} 
                  style={styles.avatar} 
                />
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
            {!isMe && !isDeletedGlobally && isFirstInGroup && (
              <Text style={styles.senderName}>{item.is_anonymous ? "🕶️ Anonymous" : (item.profiles?.full_name || "Participant")}</Text>
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
                    <TouchableOpacity onPress={() => handleUndoMessage(item.id)}>
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
                               selectedMessage.sender_id === TEST_USER_ID &&
                               (Date.now() - new Date(selectedMessage.created_at).getTime()) < DELETE_TIME_LIMIT_MS;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <ChevronLeft size={24} color="#F1F5F9" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle}>Event Chat</Text>
            {/* Status Indicator Dot */}
            <View style={[
                styles.statusDot, 
                Object.values(presenceState).some(p => p.user_id !== TEST_USER_ID && p.status === 'active') ? styles.onlineDot : styles.offlineDot 
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
          <MoreVertical size={20} color="#F1F5F9" />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)",
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
  dateSeparator: { alignSelf: 'center', marginVertical: 20, backgroundColor: 'rgba(30, 41, 59, 0.8)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  dateSeparatorText: { color: '#94A3B8', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  messageOuter: { flexDirection: "row", marginBottom: 2, maxWidth: "85%" },
  myMessageOuter: { alignSelf: "flex-end" },
  theirMessageOuter: { alignSelf: "flex-start" },
  messageLastInGroup: { marginBottom: 12 },
  avatarSpace: { width: 40, marginRight: 4, alignItems: 'center', justifyContent: 'flex-end' },
  avatar: { width: 32, height: 32, borderRadius: 16, marginBottom: 2 },
  
  // Standard Messages
  messageBubble: { padding: 8, paddingHorizontal: 12, borderRadius: 16 },
  myBubble: { backgroundColor: "#818CF8", borderTopRightRadius: 4 },
  myBubbleContinued: { borderTopRightRadius: 16 },
  theirBubble: { backgroundColor: "#141B2D", borderTopLeftRadius: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  theirBubbleContinued: { borderTopLeftRadius: 16 },
  senderName: { fontSize: 12, fontWeight: "700", color: "#818CF8", marginBottom: 2 },
  bubbleContent: { flexDirection: 'column' },
  messageText: { fontSize: 15, lineHeight: 22 },
  myText: { color: "#FFFFFF" },
  theirText: { color: "#F1F5F9" },
  messageFooter: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginTop: 2, gap: 4 },
  timestamp: { fontSize: 10, color: "rgba(255,255,255,0.5)" },
  myTime: { color: "rgba(255, 255, 255, 0.6)" },
  theirTime: { color: "#64748B" },
  ticksContainer: { marginLeft: 2 },
  tick: { fontSize: 10, fontWeight: "800" },
  deliveredTick: { color: "rgba(255, 255, 255, 0.5)" },
  seenTick: { color: "#3B82F6" },
  
  systemMessageContainer: { alignSelf: 'center', marginVertical: 12, backgroundColor: 'rgba(30, 41, 59, 0.5)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  systemMessageText: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
  
  deletedBubble: { backgroundColor: "#1E293B", opacity: 0.6, borderStyle: 'dashed' },
  deletedText: { color: "#94A3B8", fontStyle: 'italic', fontSize: 14 },

  // Media & Location
  mediaImage: { width: 200, height: 200, borderRadius: 12, backgroundColor: "#1E293B" },
  videoContainer: { justifyContent: "center", alignItems: "center", overflow: 'hidden' },
  playIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  locationContainer: { width: 200, padding: 16, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.2)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  locationCoords: { fontSize: 10, color: "#94A3B8", marginTop: 4 },

  // Poll Cards
  pollCard: {
    backgroundColor: "#141B2D",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    padding: 14,
    minWidth: 260,
  },
  pollHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  pollTitle: { fontSize: 12, fontWeight: "700", color: "#818CF8", textTransform: "uppercase" },
  pollQuestion: { fontSize: 16, fontWeight: "700", color: "#F1F5F9", marginBottom: 16 },
  pollOptionsContainer: { gap: 8 },
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
    width: 18, height: 18, borderRadius: 9, 
    borderWidth: 2, borderColor: "#475569", marginRight: 12
  },
  pollResultItem: {
    position: "relative",
    backgroundColor: "#0F172A",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    overflow: "hidden",
  },
  myPollResult: {
    borderColor: "rgba(129, 140, 248, 0.4)",
  },
  pollProgress: {
    position: "absolute", left: 0, top: 0, bottom: 0,
    backgroundColor: "rgba(129, 140, 248, 0.15)",
  },
  myPollProgress: {
    backgroundColor: "rgba(129, 140, 248, 0.3)",
  },
  pollResultContent: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 12,
  },
  pollOptionText: { fontSize: 14, color: "#F1F5F9", flex: 1, fontWeight: "500" },
  myPollOptionText: { color: "#818CF8", fontWeight: "700" },
  pollStats: { flexDirection: "row", alignItems: "center", marginLeft: 12 },
  myVoteCheck: { color: "#818CF8", fontWeight: "800", marginRight: 6, fontSize: 14 },
  pollPercentage: { fontSize: 12, color: "#94A3B8", minWidth: 28, textAlign: "right" },
  myPollPercentage: { color: "#818CF8", fontWeight: "700" },
  pollFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)", paddingTop: 12 },
  pollFooterText: { fontSize: 12, color: "#64748B", fontWeight: "500" },
  pollFooterTime: { fontSize: 10, color: "#475569" },

  // Delete Menu Modal
  deleteMenu: {
    backgroundColor: "#0F172A",
    borderRadius: 24,
    padding: 24,
    width: '85%',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  deleteMenuTitle: {
    color: "#F1F5F9",
    fontSize: 18,
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
  uploadProgressContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 8, padding: 8, backgroundColor: "rgba(129, 140, 248, 0.1)", borderRadius: 12 },
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
    borderRadius: 24, 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
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
    fontSize: 15, 
    maxHeight: 120, 
    minHeight: 40,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 8,
  },
  sendBtn: {
    width: 36, 
    height: 36, 
    backgroundColor: "#818CF8", 
    borderRadius: 18,
    alignItems: "center", 
    justifyContent: "center", 
    marginLeft: 4,
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
  typingArea: { paddingHorizontal: 20, paddingVertical: 6, backgroundColor: "transparent" },
  typingIndicatorContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingBubbles: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  typingDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#818CF8' },
  typingText: { fontSize: 12, color: "#818CF8", fontWeight: "600", fontStyle: "italic" },

  statusDot: { width: 8, height: 8, borderRadius: 4, marginTop: 2 },
  onlineDot: { backgroundColor: "#34D399" },
  offlineDot: { backgroundColor: "#F87171" },

  // Check-In Bar
  checkInBar: { 
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#0F172A", paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)",
  },
  checkInInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkInText: { color: "#F1F5F9", fontSize: 13, fontWeight: "600" },
  arrivedBtn: { backgroundColor: "#34D399", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  arrivedBtnText: { color: "#0F172A", fontSize: 12, fontWeight: "800" },

  // Pinned Banner
  pinnedBanner: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#1E293B",
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)",
  },
  pinnedTitle: { fontSize: 10, fontWeight: "800", color: "#818CF8", textTransform: "uppercase", marginBottom: 2 },
  pinnedContent: { fontSize: 13, color: "#CBD5E1" },

  // Spam Warning
  spamWarning: { 
    flexDirection: "row", alignItems: "center", backgroundColor: "rgba(245, 158, 11, 0.1)",
    paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 12, marginBottom: 8, borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(245, 158, 11, 0.2)",
  },
  spamWarningText: { color: "#F59E0B", fontSize: 12, fontWeight: "600" },

  // Summary Card
  summaryCard: {
    backgroundColor: "#0F172A", borderRadius: 24, padding: 24, marginVertical: 20,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignSelf: "stretch",
  },
  summaryTitle: { fontSize: 18, fontWeight: "800", color: "#F1F5F9", marginBottom: 16, textAlign: "center" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  summaryLabel: { fontSize: 14, color: "#94A3B8", fontWeight: "600" },
  summaryValue: { fontSize: 14, color: "#F1F5F9", fontWeight: "700" },

  emptyContainer: { alignItems: "center", marginTop: 40 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#475569", marginBottom: 20 },
  icebreakerContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10 },
  icebreaker: { backgroundColor: "#1E293B", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  icebreakerText: { color: "#CBD5E1", fontSize: 14, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", padding: 24 },
  modalContent: { backgroundColor: "#0F172A", borderRadius: 32, padding: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#F1F5F9" },
  modalInput: {
    backgroundColor: "#1E293B", borderRadius: 16, padding: 16, color: "#F1F5F9",
    marginBottom: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)",
  },
  addOptionBtn: { alignSelf: "flex-start", marginBottom: 24 },
  addOptionText: { color: "#818CF8", fontWeight: "700" },
  createPollBtn: { backgroundColor: "#818CF8", paddingVertical: 18, borderRadius: 20, alignItems: "center" },
  createPollBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },

  // Privacy Styles
  privacyBadgeContainer: { flexDirection: 'row', marginBottom: 4, gap: 4 },
  privacyBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, gap: 4 },
  viewOnlyBadge: { backgroundColor: 'rgba(248, 113, 113, 0.15)' },
  requestBadge: { backgroundColor: 'rgba(251, 191, 36, 0.15)' },
  privacyBadgeText: { fontSize: 9, fontWeight: '800', color: '#CBD5E1', textTransform: 'uppercase' },
  
  restrictedMediaContainer: { width: 200, height: 200, borderRadius: 12, overflow: 'hidden', backgroundColor: '#0F172A' },
  restrictOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  restrictTitle: { color: '#FFF', fontSize: 16, fontWeight: '800', marginTop: 12, textAlign: 'center' },
  restrictSubtitle: { color: '#94A3B8', fontSize: 12, textAlign: 'center', marginTop: 4 },
  requestActionBtn: { backgroundColor: '#818CF8', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginTop: 16 },
  requestActionText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  
  viewOnlyOverlay: { position: 'absolute', bottom: 8, left: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  viewOnlyText: { color: '#FFF', fontSize: 10, fontWeight: '600' },

  permissionSelector: { marginBottom: 24, padding: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20 },
  permissionLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '700', marginBottom: 12, textTransform: 'uppercase' },
  permissionOptions: { flexDirection: 'row', gap: 8 },
  permissionOption: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)' },
  permissionOptionActive: { backgroundColor: '#818CF8', borderColor: '#818CF8' },
  permissionOptionText: { fontSize: 10, fontWeight: '800', color: '#64748B' },
  permissionOptionTextActive: { color: '#FFF' },
  permissionHint: { color: '#64748B', fontSize: 11, marginTop: 10, fontStyle: 'italic' },

  screenshotWarning: { position: 'absolute', top: 80, left: 20, right: 20, backgroundColor: '#EF4444', padding: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 1000, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10 },
  screenshotWarningText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  
  // Undo Message Timer
  undoContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 4, width: '100%' },
  pendingText: { color: '#FCD34D', fontSize: 11, fontWeight: '600', fontStyle: 'italic' },
  undoText: { color: '#EF4444', fontSize: 11, fontWeight: '800', backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },

  // Advanced Features Toggles
  advancedFeaturesRow: { flexDirection: 'row', gap: 8, marginBottom: 12, paddingHorizontal: 8 },
  featureToggle: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  featureToggleActive: { backgroundColor: 'rgba(129, 140, 248, 0.2)', borderColor: 'rgba(129, 140, 248, 0.4)' },
  featureToggleText: { color: '#94A3B8', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  featureToggleTextActive: { color: '#FFF' },
});
