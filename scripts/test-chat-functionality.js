#!/usr/bin/env node

/**
 * Chat & Notifications Test Automation Script
 * 
 * This script helps verify the chat functionality is working correctly
 * by running automated checks against the database and API endpoints.
 * 
 * Usage: node scripts/test-chat-functionality.js
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration - update these with your actual values
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'your-service-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test configuration
const TEST_USERS = {
  userA: { email: 'IT23100001@my.sliit.lk', password: 'Demo@1234' },
  userB: { email: 'IT23100002@my.sliit.lk', password: 'Demo@1234' },
  userC: { email: 'IT23100003@my.sliit.lk', password: 'Demo@1234' }
};

let testResults = {
  passed: 0,
  failed: 0,
  details: []
};

// Utility functions
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
}

function logTestResult(testName, passed, details = '') {
  testResults[passed ? 'passed' : 'failed']++;
  testResults.details.push({
    test: testName,
    passed,
    details,
    timestamp: new Date().toISOString()
  });
  
  const status = passed ? '✅ PASS' : '❌ FAIL';
  log(`${status}: ${testName} ${details ? '- ' + details : ''}`, passed ? 'SUCCESS' : 'ERROR');
}

// Test functions
async function testDatabaseSchema() {
  log('Testing database schema...');
  
  try {
    // Test messages table
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .limit(1);
    
    logTestResult('Messages table exists', !messagesError, messagesError?.message);
    
    // Test notifications table
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('*')
      .limit(1);
    
    logTestResult('Notifications table exists', !notificationsError, notificationsError?.message);
    
    // Test polls tables
    const { data: polls, error: pollsError } = await supabase
      .from('chat_polls')
      .select('*')
      .limit(1);
    
    logTestResult('Chat polls table exists', !pollsError, pollsError?.message);
    
    // Test relationships
    const { data: messageWithProfile, error: relationshipError } = await supabase
      .from('messages')
      .select(`
        *,
        profiles (full_name)
      `)
      .limit(1);
    
    logTestResult('Message-Profile relationship works', !relationshipError, relationshipError?.message);
    
  } catch (error) {
    logTestResult('Database schema test', false, error.message);
  }
}

async function testUserAuthentication() {
  log('Testing user authentication...');
  
  try {
    for (const [userName, userData] of Object.entries(TEST_USERS)) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: userData.password
      });
      
      logTestResult(`${userName} authentication`, !error, error?.message);
      
      if (data.user) {
        // Test profile retrieval
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
        
        logTestResult(`${userName} profile retrieval`, !profileError, profileError?.message);
      }
    }
  } catch (error) {
    logTestResult('Authentication test', false, error.message);
  }
}

async function testEventCreation() {
  log('Testing event creation...');
  
  try {
    // Get first test user
    const { data: authData } = await supabase.auth.signInWithPassword({
      email: TEST_USERS.userA.email,
      password: TEST_USERS.userA.password
    });
    
    if (authData.user) {
      // Create test event
      const testEvent = {
        creator_id: authData.user.id,
        title: 'Test Chat Event',
        category_id: 'sports',
        category_label: 'Sports',
        location: 'Test Location',
        event_date: new Date().toISOString().split('T')[0],
        event_time: '14:00',
        people_needed: 4,
        join_mode: 'direct',
        status: 'active'
      };
      
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert(testEvent)
        .select()
        .single();
      
      logTestResult('Event creation', !eventError, eventError?.message);
      
      if (event) {
        // Test event participation
        const { error: participantError } = await supabase
          .from('event_participants')
          .insert({
            event_id: event.id,
            user_id: authData.user.id
          });
        
        logTestResult('Event participation', !participantError, participantError?.message);
        
        return event.id; // Return event ID for chat tests
      }
    }
  } catch (error) {
    logTestResult('Event creation test', false, error.message);
  }
  
  return null;
}

async function testChatFunctionality(eventId) {
  if (!eventId) {
    logTestResult('Chat functionality test', false, 'No event ID provided');
    return;
  }
  
  log('Testing chat functionality...');
  
  try {
    // Get authenticated user
    const { data: authData } = await supabase.auth.signInWithPassword({
      email: TEST_USERS.userA.email,
      password: TEST_USERS.userA.password
    });
    
    if (authData.user) {
      // Test message sending
      const testMessage = {
        event_id: eventId,
        sender_id: authData.user.id,
        content: 'Test message from automation',
        status: 'sent'
      };
      
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert(testMessage)
        .select(`
          *,
          profiles (full_name)
        `)
        .single();
      
      logTestResult('Message sending', !messageError, messageError?.message);
      
      if (message) {
        // Test message retrieval
        const { data: messages, error: retrievalError } = await supabase
          .from('messages')
          .select(`
            *,
            profiles (full_name)
          `)
          .eq('event_id', eventId)
          .order('created_at', { ascending: true });
        
        logTestResult('Message retrieval', !retrievalError, retrievalError?.message);
        logTestResult('Message count > 0', messages && messages.length > 0, `Found ${messages?.length || 0} messages`);
        
        // Test poll creation
        const testPoll = {
          event_id: eventId,
          creator_id: authData.user.id,
          question: 'Test poll from automation',
          is_multiple_choice: false
        };
        
        const { data: poll, error: pollError } = await supabase
          .from('chat_polls')
          .insert(testPoll)
          .select()
          .single();
        
        logTestResult('Poll creation', !pollError, pollError?.message);
        
        if (poll) {
          // Test poll options
          const pollOptions = [
            { poll_id: poll.id, option_text: 'Option 1' },
            { poll_id: poll.id, option_text: 'Option 2' }
          ];
          
          const { error: optionsError } = await supabase
            .from('chat_poll_options')
            .insert(pollOptions);
          
          logTestResult('Poll options creation', !optionsError, optionsError?.message);
        }
        
        // Test notification creation
        const testNotification = {
          user_id: authData.user.id,
          actor_id: authData.user.id,
          event_id: eventId,
          type: 'message',
          title: 'Test notification',
          body: 'This is a test notification',
          data: { eventId, test: true }
        };
        
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(testNotification);
        
        logTestResult('Notification creation', !notificationError, notificationError?.message);
      }
    }
  } catch (error) {
    logTestResult('Chat functionality test', false, error.message);
  }
}

async function testRealtimeFeatures() {
  log('Testing realtime features...');
  
  try {
    // Test channel subscription (basic connectivity)
    const channel = supabase.channel('test-channel');
    
    const subscriptionPromise = new Promise((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          resolve(true);
        } else if (status === 'CHANNEL_ERROR') {
          resolve(false);
        }
      });
    });
    
    const isSubscribed = await subscriptionPromise;
    logTestResult('Realtime channel subscription', isSubscribed);
    
    // Clean up
    supabase.removeChannel(channel);
    
  } catch (error) {
    logTestResult('Realtime features test', false, error.message);
  }
}

async function testStorageBucket() {
  log('Testing storage bucket...');
  
  try {
    // Check if chat-media bucket exists
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    const chatMediaBucket = buckets?.find(b => b.name === 'chat-media');
    logTestResult('Chat media bucket exists', !!chatMediaBucket && !bucketError, bucketError?.message);
    
    if (chatMediaBucket) {
      // Test bucket policies by checking if we can list files
      const { data: files, error: filesError } = await supabase.storage
        .from('chat-media')
        .list();
      
      logTestResult('Storage bucket access', !filesError, filesError?.message);
    }
    
  } catch (error) {
    logTestResult('Storage bucket test', false, error.message);
  }
}

async function cleanupTestData() {
  log('Cleaning up test data...');
  
  try {
    // Clean up test events
    const { error: eventCleanupError } = await supabase
      .from('events')
      .delete()
      .like('title', 'Test%');
    
    logTestResult('Test event cleanup', !eventCleanupError, eventCleanupError?.message);
    
    // Clean up test notifications
    const { error: notificationCleanupError } = await supabase
      .from('notifications')
      .delete()
      .like('title', 'Test%');
    
    logTestResult('Test notification cleanup', !notificationCleanupError, notificationCleanupError?.message);
    
  } catch (error) {
    logTestResult('Cleanup test', false, error.message);
  }
}

// Main test execution
async function runAllTests() {
  log('🚀 Starting Chat & Notifications Test Suite');
  log('=' .repeat(50));
  
  try {
    // Run all tests
    await testDatabaseSchema();
    await testUserAuthentication();
    const eventId = await testEventCreation();
    await testChatFunctionality(eventId);
    await testRealtimeFeatures();
    await testStorageBucket();
    
    // Optional: Clean up test data
    // await cleanupTestData();
    
  } catch (error) {
    log(`Test suite error: ${error.message}`, 'ERROR');
  }
  
  // Print final results
  log('=' .repeat(50));
  log('📊 Test Results Summary');
  log(`Total Tests: ${testResults.passed + testResults.failed}`);
  log(`✅ Passed: ${testResults.passed}`);
  log(`❌ Failed: ${testResults.failed}`);
  
  if (testResults.failed > 0) {
    log('\nFailed Tests:', 'ERROR');
    testResults.details
      .filter(result => !result.passed)
      .forEach(result => {
        log(`  - ${result.test}: ${result.details}`, 'ERROR');
      });
  }
  
  const successRate = (testResults.passed / (testResults.passed + testResults.failed)) * 100;
  log(`\nSuccess Rate: ${successRate.toFixed(1)}%`);
  
  if (successRate >= 90) {
    log('🎉 Test suite passed! System is ready for production.', 'SUCCESS');
  } else if (successRate >= 70) {
    log('⚠️  Test suite partially passed. Review failed tests.', 'WARNING');
  } else {
    log('🚨 Test suite failed. Major issues need to be addressed.', 'ERROR');
  }
  
  return testResults;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests()
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      log(`Fatal error: ${error.message}`, 'ERROR');
      process.exit(1);
    });
}

module.exports = {
  runAllTests,
  testDatabaseSchema,
  testUserAuthentication,
  testEventCreation,
  testChatFunctionality,
  testRealtimeFeatures,
  testStorageBucket
};
