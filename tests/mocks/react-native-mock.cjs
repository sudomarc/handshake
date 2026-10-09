exports.PermissionsAndroid = {
  PERMISSIONS: {
    POST_NOTIFICATIONS: "android.permission.POST_NOTIFICATIONS",
    READ_PHONE_STATE: "android.permission.READ_PHONE_STATE",
  },
  RESULTS: {
    GRANTED: "granted",
    DENIED: "denied",
    NEVER_ASK_AGAIN: "never_ask_again",
  },
  check: async () => false,
  request: async () => "denied",
};

exports.Platform = {
  OS: "android",
  Version: 33,
};
