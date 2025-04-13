/**
 * Analytics events constants for Kindred app
 * Centralizing event names to ensure consistency across the app
 */

// User events
export const USER_EVENTS = {
  LOGIN: 'user_login',
  LOGOUT: 'user_logout',
  REGISTER: 'user_register',
  UPDATE_PROFILE: 'user_update_profile',
  COMPLETE_ONBOARDING: 'user_complete_onboarding',
  UPGRADE_SUBSCRIPTION: 'user_upgrade_subscription'
};

// Match related events
export const MATCH_EVENTS = {
  VIEW_MATCHES: 'view_matches',
  RECEIVE_MATCH: 'receive_match',
  ACCEPT_MATCH: 'accept_match',
  REJECT_MATCH: 'reject_match'
};

// Communication events
export const COMMUNICATION_EVENTS = {
  START_CHAT: 'start_chat',
  SEND_MESSAGE: 'send_message',
  INITIATE_CALL: 'initiate_call',
  ACCEPT_CALL: 'accept_call',
  REJECT_CALL: 'reject_call',
  END_CALL: 'end_call'
};

// Feature usage events
export const FEATURE_EVENTS = {
  USE_NOTEPAD: 'use_notepad',
  VIEW_PROFILE: 'view_profile',
  SEARCH_USERS: 'search_users'
};

// Page view events
export const PAGE_EVENTS = {
  VIEW_HOME: 'view_home_page',
  VIEW_PROFILE: 'view_profile_page',
  VIEW_MATCHES: 'view_matches_page',
  VIEW_CHATS: 'view_chats_page',
  VIEW_CONVERSATION: 'view_conversation_page',
  VIEW_CALL: 'view_call_page',
  VIEW_SETTINGS: 'view_settings_page'
};

// Aggregate all event types
export const ANALYTICS_EVENTS = {
  ...USER_EVENTS,
  ...MATCH_EVENTS,
  ...COMMUNICATION_EVENTS,
  ...FEATURE_EVENTS,
  ...PAGE_EVENTS
};

export default ANALYTICS_EVENTS;