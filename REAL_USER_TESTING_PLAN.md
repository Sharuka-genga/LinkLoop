# Real User Testing Plan - Chat & Notifications Module

## 🎯 Testing Objective
Verify all chat and notification features work end-to-end with real users, real data, and real-time functionality.

## 🧪 Test Environment Setup

### Prerequisites
1. **Database Setup**: Run `supabase/fix_chat_schema.sql` in Supabase SQL Editor
2. **Edge Functions**: Deploy `handle-chat-notifications` and `process-scheduled-messages`
3. **Test Users**: Use existing seed users or create new real users
4. **Devices**: At least 2 separate devices/emulators for multi-user testing

### Test Users (from seed data)
- **User A**: `IT23100001@my.sliit.lk` / `Demo@1234` (Nimasha Ranawana)
- **User B**: `IT23100002@my.sliit.lk` / `Demo@1234` (Kavindu Perera)  
- **User C**: `IT23100003@my.sliit.lk` / `Demo@1234` (Sanduni Fernando)

## 📋 Comprehensive Test Scenarios

### Phase 1: Authentication & Access Control
**Test Case 1.1: User Login**
- [ ] User A logs in successfully
- [ ] Profile data loads correctly (name, avatar, interests)
- [ ] User can navigate to main tabs
- [ ] No console errors during login

**Test Case 1.2: Chat Access Verification**
- [ ] User A creates an event
- [ ] User B tries to access chat without joining → Should be denied
- [ ] User B joins the event → Should gain chat access
- [ ] User C (not joined) tries to access → Should be denied

### Phase 2: Basic Chat Functionality
**Test Case 2.1: Text Messaging**
- [ ] User A sends text message → Appears instantly for User B
- [ ] User B replies → Appears instantly for User A
- [ ] Messages show correct sender names and avatars
- [ ] Message timestamps are accurate
- [ ] No duplicate messages appear

**Test Case 2.2: Real-time Updates**
- [ ] Both users have chat open simultaneously
- [ ] Messages appear in real-time without refresh
- [ ] Typing indicators show when other user is typing
- [ ] Online/offline status updates correctly

**Test Case 2.3: Message Management**
- [ ] User A edits a message → Update reflects for User B
- [ ] User A deletes a message → Shows as deleted for User B
- [ ] User A pins a message → Shows as pinned for both users
- [ ] Message history persists after app restart

### Phase 3: Media & Advanced Features
**Test Case 3.1: Image Upload & Display**
- [ ] User A selects image from gallery
- [ ] Image uploads successfully with progress indicator
- [ ] Image appears in chat for both users
- [ ] Image is accessible and viewable
- [ ] Image persists after app restart

**Test Case 3.2: Poll Creation & Voting**
- [ ] User A creates a poll with multiple options
- [ ] Poll message appears in chat for User B
- [ ] User B votes on an option
- [ ] Vote count updates in real-time for User A
- [ ] User B changes vote → Count updates correctly
- [ ] Poll results show accurate vote counts

**Test Case 3.3: Anonymous Messaging**
- [ ] User A enables anonymous mode
- [ ] Sends anonymous message → Shows as "Anonymous" for User B
- [ ] User profile is hidden for anonymous messages
- [ ] System still tracks real sender for permissions

### Phase 4: Notifications System
**Test Case 4.1: Message Notifications**
- [ ] User B navigates away from chat
- [ ] User A sends message → User B receives notification
- [ ] Notification shows correct sender and message preview
- [ ] Tapping notification opens correct chat screen
- [ ] Unread count updates correctly

**Test Case 4.2: Event Notifications**
- [ ] User A invites User B to event → User B gets notification
- [ ] User B accepts invitation → User A gets notification
- [ ] User C requests to join → User A gets notification
- [ ] All notifications show correct actions and data

**Test Case 4.3: Notification Management**
- [ ] User can mark notifications as read
- [ ] User can delete individual notifications
- [ ] User can mark all as read
- [ ] Unread count badge updates correctly
- [ ] Notifications persist after app restart

### Phase 5: Advanced Features
**Test Case 5.1: Scheduled Messages**
- [ ] User A schedules message for future time
- [ ] Message appears in chat at scheduled time
- [ ] Both users receive scheduled message
- [ ] User can cancel scheduled message before sending

**Test Case 5.2: Event Check-ins**
- [ ] User A checks in to event
- [ ] Check-in count updates for all users
- [ ] Check-in status persists
- [ ] Multiple users can check in

**Test Case 5.3: Presence & Activity**
- [ ] Online status updates when users open/close app
- [ ] Last seen timestamps are accurate
- [ ] Typing indicators appear/disappear correctly
- [ ] User presence syncs across multiple devices

### Phase 6: Security & Privacy
**Test Case 6.1: Access Control**
- [ ] Non-participants cannot access chat
- [ ] Users can only edit/delete their own messages
- [ ] Anonymous mode protects sender identity
- [ ] Media access requests work for private content

**Test Case 6.2: Data Persistence**
- [ ] Chat history survives app restart
- [ ] User sessions persist after logout/login
- [ ] Draft messages saved temporarily
- [ ] Offline mode queues messages (if implemented)

## 🔍 Performance & Error Testing

### Performance Tests
- [ ] Messages load quickly even with long chat history
- [ ] Image uploads complete within reasonable time
- [ ] Real-time updates have minimal latency
- [ ] App responds smoothly during rapid messaging

### Error Handling Tests
- [ ] Network disconnect → Graceful error handling
- [ ] Image upload failure → Clear error message
- [ ] Invalid event ID → Proper access denied
- [ ] Database errors → User-friendly error messages

## 📊 Success Criteria

### Must Pass (Critical)
- ✅ All users can log in and access their events
- ✅ Real-time messaging works between multiple users
- ✅ Image upload and display works correctly
- ✅ Poll creation and voting functions properly
- ✅ Notifications are sent and received correctly
- ✅ Access control prevents unauthorized access

### Should Pass (Important)
- ✅ Typing indicators and online status work
- ✅ Message editing/deletion works
- ✅ Anonymous messaging functions
- ✅ Scheduled messages work
- ✅ Check-in system works

### Nice to Have (Enhancement)
- ✅ Offline message queuing
- ✅ Message search functionality
- ✅ Advanced notification settings
- ✅ Media access control system

## 🐛 Bug Reporting Template

### Bug Report Format
```
**Test Case**: [Test case number and description]
**Device**: [Device/emulator used]
**User**: [Which user account]
**Steps to Reproduce**: 
1. [Step 1]
2. [Step 2]
3. [Step 3]
**Expected Result**: [What should happen]
**Actual Result**: [What actually happened]
**Error Messages**: [Any console errors shown]
**Screenshot/Video**: [If available]
```

## 📱 Testing Devices

### Recommended Setup
1. **Device 1**: Physical phone/tablet (User A)
2. **Device 2**: Different physical phone or emulator (User B)
3. **Device 3**: Web browser or additional emulator (User C)

### Browser Testing
- [ ] Chrome/Edge on desktop
- [ ] Safari on macOS/iOS
- [ ] Mobile browsers (Chrome Mobile, Safari Mobile)

## ⏱️ Testing Timeline

### Session 1: Basic Functionality (2 hours)
- Authentication and access control
- Basic text messaging
- Real-time updates

### Session 2: Advanced Features (2 hours)
- Image uploads
- Poll creation and voting
- Notifications

### Session 3: Edge Cases (1 hour)
- Error handling
- Performance testing
- Security verification

## 🎯 Final Acceptance Criteria

The Chat & Notifications module is **production-ready** when:

1. ✅ **All critical test cases pass** without major issues
2. ✅ **No console errors** appear during normal usage
3. ✅ **Real-time features work seamlessly** between multiple users
4. ✅ **All data persists correctly** across app sessions
5. ✅ **Security measures prevent unauthorized access**
6. ✅ **Performance is acceptable** on all target devices
7. ✅ **User experience is smooth and intuitive**

## 📞 Support Contact

For any issues during testing:
- Check console logs for error messages
- Verify database schema is properly applied
- Ensure Edge Functions are deployed
- Confirm test users have proper permissions

---

**Ready for Production!** 🚀

Once all test cases pass and success criteria are met, the Chat & Notifications module will be fully production-ready and safe to merge into the main branch.
