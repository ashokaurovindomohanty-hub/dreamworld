import Map "mo:core/Map";
import List "mo:core/List";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Set "mo:core/Set";
import Principal "mo:core/Principal";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Authorization "authorization/access-control";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import MixinAuthorization "authorization/MixinAuthorization";
 // migration function


actor {
  include MixinStorage();

  // Types
  type AvatarConfig = {
    bodyType : Text;
    outfit : Text;
    accessory : Text;
    color : Text;
  };

  type UserProfile = {
    username : Text;
    bio : Text;
    avatar : AvatarConfig;
    currentZone : Text;
    joinDate : Int;
    totalScore : Nat;
  };

  type ChatMessage = {
    sender : Text;
    content : Text;
    timestamp : Int;
  };

  type Group = {
    name : Text;
    description : Text;
    creator : Principal;
    members : [Principal];
  };

  type Quest = {
    id : Nat;
    title : Text;
    description : Text;
    rewardPoints : Nat;
  };

  type Notification = {
    message : Text;
    timestamp : Int;
    read : Bool;
  };

  type FriendRequest = {
    from : Principal;
    to : Principal;
    timestamp : Int;
    status : {
      #pending;
      #accepted;
      #declined;
    };
  };

  // New types
  type WorldEvent = {
    id : Nat;
    title : Text;
    description : Text;
    zone : Text;
    startTime : Int;
    endTime : Int;
    createdBy : Text;
    attendees : Set.Set<Principal>;
  };

  type WorldEventView = {
    id : Nat;
    title : Text;
    description : Text;
    zone : Text;
    startTime : Int;
    endTime : Int;
    createdBy : Text;
    attendees : [Principal];
  };

  type DreamJournalEntry = {
    id : Nat;
    author : Principal;
    authorName : Text;
    title : Text;
    content : Text;
    timestamp : Int;
    isPublic : Bool;
    likes : Set.Set<Principal>;
  };

  type DreamJournalEntryView = {
    id : Nat;
    author : Principal;
    authorName : Text;
    title : Text;
    content : Text;
    timestamp : Int;
    isPublic : Bool;
    likes : [Principal];
  };

  type StarDedication = {
    id : Nat;
    dedicatorName : Text;
    recipientName : Text;
    message : Text;
    timestamp : Int;
    dedicatedBy : Principal;
  };

  type DreamJournalEntryCreateInput = {
    title : Text;
    content : Text;
    isPublic : Bool;
    timestamp : Int;
  };

  type NotificationCreateInput = {
    message : Text;
    timestamp : Int;
    read : Bool;
  };

  // Authorization
  let accessControlState = Authorization.initState();
  include MixinAuthorization(accessControlState);

  // State
  let userProfiles = Map.empty<Principal, UserProfile>();
  let zones = Map.empty<Text, [Principal]>();
  let zoneChats = Map.empty<Text, List.List<ChatMessage>>();
  let groups = Map.empty<Text, Group>();
  let quests = Map.empty<Nat, Quest>();
  let userQuests = Map.empty<Principal, List.List<Nat>>();
  let completedQuests = Map.empty<Principal, List.List<Nat>>();
  let notifications = Map.empty<Principal, List.List<Notification>>();
  let friendRequests = Map.empty<Principal, List.List<FriendRequest>>();
  let friends = Map.empty<Principal, List.List<Principal>>();

  let nextWorldEventId = Map.empty<Nat, Nat>();
  let worldEvents = Map.empty<Nat, WorldEvent>();
  let nextJournalEntryId = Map.empty<Nat, Nat>();
  let nextStarId = Map.empty<Nat, Nat>();

  let dreamJournalEntries = Map.empty<Principal, Map.Map<Nat, DreamJournalEntry>>();
  let starDedicationsByPrincipal = Map.empty<Principal, Map.Map<Nat, StarDedication>>();

  func getNextId(counter : Map.Map<Nat, Nat>, key : Nat) : Nat {
    let id = switch (counter.get(key)) {
      case (null) { 1 };
      case (?value) { value + 1 };
    };
    counter.add(key, id);
    id;
  };

  func getNextIdWithLimit(counter : Map.Map<Nat, Nat>, key : Nat, max : Nat) : Nat {
    switch (counter.get(key)) {
      case (?id) {
        if (id >= max) {
          Runtime.trap("Maximum entries reached for this item. Cannot create more!");
        };
        let newId = id + 1;
        counter.add(key, newId);
        newId;
      };
      case (null) {
        let newId = 1;
        counter.add(key, newId);
        newId;
      };
    };
  };

  func convertWorldEventToView(event : WorldEvent) : WorldEventView {
    { event with attendees = event.attendees.toArray() };
  };

  func convertDreamJournalEntryToView(entry : DreamJournalEntry) : DreamJournalEntryView {
    { entry with likes = entry.likes.toArray() };
  };

  func convertEntriesToViews(entries : Map.Map<Nat, DreamJournalEntry>) : [DreamJournalEntryView] {
    entries.values().map(func(entry) { convertDreamJournalEntryToView(entry) }).toArray();
  };

  func getUserProfileInternal(user : Principal) : UserProfile {
    switch (userProfiles.get(user)) {
      case (null) { Runtime.trap("User profile not found") };
      case (?profile) { profile };
    };
  };

  // Helper functions
  module UserProfile {
    public func compareByScore(a : UserProfile, b : UserProfile) : Order.Order {
      Nat.compare(b.totalScore, a.totalScore);
    };
  };

  module ChatMessage {
    public func convertToView(chatMessage : ChatMessage) : ChatMessage {
      chatMessage;
    };
  };

  module Group {
    public func convertToView(group : Group) : Group {
      group;
    };
  };

  module Quest {
    public func convertToView(quest : Quest) : Quest {
      quest;
    };
  };

  module Notification {
    public func convertToView(notification : Notification) : Notification {
      notification;
    };
  };

  module FriendRequest {
    public func convertToView(friendRequest : FriendRequest) : FriendRequest {
      friendRequest;
    };
  };

  module StarDedication {
    public func convertToView(starDedication : StarDedication) : StarDedication {
      starDedication;
    };
  };

  // Required User Profile Functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not Authorization.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func saveCallerUserProfileBook(input : UserProfile) : async UserProfile {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, input);
    input;
  };

  // User Profile
  public shared ({ caller }) func createProfile(username : Text, bio : Text) : async () {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create profiles");
    };

    let avatar : AvatarConfig = {
      bodyType = "default";
      outfit = "default";
      accessory = "default";
      color = "default";
    };

    let profile : UserProfile = {
      username;
      bio;
      avatar;
      currentZone = "Starter Plaza";
      joinDate = Time.now();
      totalScore = 0;
    };

    userProfiles.add(caller, profile);

    // Initialize user state
    zones.add("Starter Plaza", [caller]);
    userQuests.add(caller, List.empty<Nat>());
    completedQuests.add(caller, List.empty<Nat>());
    notifications.add(caller, List.empty<Notification>());
    friends.add(caller, List.empty<Principal>());
    friendRequests.add(caller, List.empty<FriendRequest>());
  };

  public query ({ caller }) func getProfile(user : Principal) : async UserProfile {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    if (caller != user and not Authorization.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    getUserProfileInternal(user);
  };

  // Zones
  public shared ({ caller }) func teleport(zone : Text) : async () {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can teleport");
    };

    let profile = getUserProfileInternal(caller);
    let oldZone = profile.currentZone;

    // Remove from old zone
    let updatedOldZone = switch (zones.get(oldZone)) {
      case (null) { [] };
      case (?zoneArray) {
        zoneArray.filter(func(p) { not Principal.equal(p, caller) });
      };
    };
    zones.add(oldZone, updatedOldZone);

    // Add to new zone
    let newZoneUsers = switch (zones.get(zone)) {
      case (null) { [caller] };
      case (?zoneArray) { zoneArray.concat([caller]) };
    };
    zones.add(zone, newZoneUsers);

    // Update user profile
    let updatedProfile = {
      profile with
      currentZone = zone;
    };
    userProfiles.add(caller, updatedProfile);
  };

  // Chat
  public shared ({ caller }) func sendMessage(content : Text) : async () {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send messages");
    };

    let profile = getUserProfileInternal(caller);

    let message : ChatMessage = {
      sender = profile.username;
      content;
      timestamp = Time.now();
    };

    let messages = switch (zoneChats.get(profile.currentZone)) {
      case (null) { List.empty<ChatMessage>() };
      case (?msgs) { msgs };
    };

    messages.add(message);

    // Keep last 50 messages
    let messagesArray = messages.toArray();
    let trimmedMessages = if (messagesArray.size() > 50) {
      messagesArray.sliceToArray(messagesArray.size() - 50, messagesArray.size());
    } else {
      messagesArray;
    };

    zoneChats.add(profile.currentZone, List.fromArray<ChatMessage>(trimmedMessages));
  };

  public query ({ caller }) func getZoneMessages(zone : Text) : async [ChatMessage] {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view messages");
    };

    switch (zoneChats.get(zone)) {
      case (null) { [] };
      case (?messages) { messages.toArray() };
    };
  };

  // Friends System
  public shared ({ caller }) func sendFriendRequest(to : Principal) : async () {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send friend requests");
    };

    let request : FriendRequest = {
      from = caller;
      to;
      timestamp = Time.now();
      status = #pending;
    };

    let requests = switch (friendRequests.get(to)) {
      case (null) { List.empty<FriendRequest>() };
      case (?reqs) { reqs };
    };

    requests.add(request);
    friendRequests.add(to, requests);

    // Add notification
    let notification : Notification = {
      message = "Friend request received";
      timestamp = Time.now();
      read = false;
    };

    let userNotifications = switch (notifications.get(to)) {
      case (null) { List.empty<Notification>() };
      case (?notifs) { notifs };
    };
    userNotifications.add(notification);
    notifications.add(to, userNotifications);
  };

  public shared ({ caller }) func acceptFriendRequest(from : Principal) : async () {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can accept friend requests");
    };

    // Update friend request status
    let requests = switch (friendRequests.get(caller)) {
      case (null) { List.empty<FriendRequest>() };
      case (?reqs) { reqs };
    };

    let updatedRequests = requests.map<FriendRequest, FriendRequest>(
      func(req) {
        if (Principal.equal(req.from, from)) {
          { req with status = #accepted };
        } else { req };
      }
    );
    friendRequests.add(caller, updatedRequests);

    // Add to friends list
    let userFriends = switch (friends.get(caller)) {
      case (null) { List.empty<Principal>() };
      case (?frnds) { frnds };
    };
    userFriends.add(from);
    friends.add(caller, userFriends);

    let otherUserFriends = switch (friends.get(from)) {
      case (null) { List.empty<Principal>() };
      case (?frnds) { frnds };
    };
    otherUserFriends.add(caller);
    friends.add(from, otherUserFriends);
  };

  // Groups
  public shared ({ caller }) func createGroup(name : Text, description : Text) : async () {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create groups");
    };

    let newGroup : Group = {
      name;
      description;
      creator = caller;
      members = [caller];
    };

    groups.add(name, newGroup);
  };

  public shared ({ caller }) func joinGroup(groupName : Text) : async () {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can join groups");
    };

    switch (groups.get(groupName)) {
      case (null) { Runtime.trap("Group not found") };
      case (?grp) {
        let updatedMembers = grp.members.concat([caller]);
        let updatedGroup = {
          grp with
          members = updatedMembers;
        };
        groups.add(groupName, updatedGroup);
      };
    };
  };

  public query ({ caller }) func getAllGroups() : async [Group] {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view groups");
    };

    groups.values().toArray();
  };

  // Avatar Customization
  public shared ({ caller }) func updateAvatar(avatar : AvatarConfig) : async () {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update avatars");
    };

    let profile = getUserProfileInternal(caller);
    let updatedProfile = {
      profile with
      avatar;
    };
    userProfiles.add(caller, updatedProfile);
  };

  // Quests
  public shared ({ caller }) func addQuest(title : Text, description : Text, rewardPoints : Nat) : async () {
    if (not (Authorization.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add quests");
    };

    let newId = quests.size() + 1;
    let newQuest : Quest = {
      id = newId;
      title;
      description;
      rewardPoints;
    };
    quests.add(newId, newQuest);
  };

  public shared ({ caller }) func startQuest(questId : Nat) : async () {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can start quests");
    };

    let userQuestList = switch (userQuests.get(caller)) {
      case (null) { List.empty<Nat>() };
      case (?qList) { qList };
    };
    userQuestList.add(questId);
    userQuests.add(caller, userQuestList);
  };

  public shared ({ caller }) func completeQuest(questId : Nat) : async () {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can complete quests");
    };

    // Remove from active quests
    let userQuestList = switch (userQuests.get(caller)) {
      case (null) { List.empty<Nat>() };
      case (?qList) { qList };
    };
    let updatedQuestList = userQuestList.filter(func(q) { q != questId });
    userQuests.add(caller, updatedQuestList);

    // Add to completed quests
    let compQuestList = switch (completedQuests.get(caller)) {
      case (null) { List.empty<Nat>() };
      case (?qList) { qList };
    };
    compQuestList.add(questId);
    completedQuests.add(caller, compQuestList);

    // Update user score
    switch (quests.get(questId)) {
      case (null) { Runtime.trap("Quest not found") };
      case (?quest) {
        let profile = getUserProfileInternal(caller);
        let updatedProfile = {
          profile with
          totalScore = profile.totalScore + quest.rewardPoints;
        };
        userProfiles.add(caller, updatedProfile);
      };
    };

    // Add notification
    let notification : Notification = {
      message = "Quest completed";
      timestamp = Time.now();
      read = false;
    };

    let userNotifications = switch (notifications.get(caller)) {
      case (null) { List.empty<Notification>() };
      case (?notifs) { notifs };
    };
    userNotifications.add(notification);
    notifications.add(caller, userNotifications);
  };

  // Leaderboard
  public query ({ caller }) func getLeaderboard() : async [UserProfile] {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view leaderboard");
    };

    userProfiles.values().toArray().sort(UserProfile.compareByScore).sliceToArray(0, 10);
  };

  // Notifications
  public shared ({ caller }) func markAllNotificationsRead() : async () {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark notifications as read");
    };

    let userNotifications = switch (notifications.get(caller)) {
      case (null) { List.empty<Notification>() };
      case (?notifs) { notifs };
    };
    let updatedNotifications = userNotifications.map<Notification, Notification>(
      func(n) { { n with read = true } }
    );
    notifications.add(caller, updatedNotifications);
  };

  public query ({ caller }) func getUnreadNotificationCount() : async Nat {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view notification count");
    };

    var count = 0;
    switch (notifications.get(caller)) {
      case (null) { () };
      case (?notifs) {
        notifs.forEach(
          func(n) {
            if (not n.read) { count += 1 };
          }
        );
      };
    };
    count;
  };

  // New Features

  // World Events
  public shared ({ caller }) func createEvent(title : Text, description : Text, zone : Text, startTime : Int, endTime : Int) : async () {
    if (not (Authorization.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can create events");
    };

    let createdBy = switch (userProfiles.get(caller)) {
      case (null) { "Admin" };
      case (?profile) { profile.username };
    };
    let newId = getNextId(nextWorldEventId, 0);

    let newEvent : WorldEvent = {
      id = newId;
      title;
      description;
      zone;
      startTime;
      endTime;
      createdBy;
      attendees = Set.empty<Principal>();
    };
    worldEvents.add(newId, newEvent);
  };

  public query ({ caller }) func getActiveEvents() : async [WorldEventView] {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view events");
    };
    let now = Time.now();
    worldEvents.values().map(func(event) { convertWorldEventToView(event) }).toArray();
  };

  public query ({ caller }) func getAllEvents() : async [WorldEventView] {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view events");
    };
    worldEvents.values().map(func(event) { convertWorldEventToView(event) }).toArray();
  };

  public shared ({ caller }) func rsvpEvent(eventId : Nat) : async () {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can RSVP to events");
    };

    switch (worldEvents.get(eventId)) {
      case (null) { Runtime.trap("Event not found") };
      case (?event) {
        if (event.attendees.contains(caller)) {
          return; // Already RSVPed
        };
        let updatedAttendees = event.attendees;
        updatedAttendees.add(caller);
        let updatedEvent = {
          event with
          attendees = updatedAttendees;
        };
        worldEvents.add(eventId, updatedEvent);
      };
    };
  };

  // Dream Journal
  public shared ({ caller }) func addJournalEntry(title : Text, content : Text, isPublic : Bool) : async () {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add journal entries");
    };

    let authorName = switch (userProfiles.get(caller)) {
      case (null) { "Anonymous" };
      case (?profile) { profile.username };
    };
    let newId = getNextId(nextJournalEntryId, 0);

    // Ensure maximum limit of 100 entries per user
    let existingEntries = switch (dreamJournalEntries.get(caller)) {
      case (null) { Map.empty<Nat, DreamJournalEntry>() };
      case (?entries) { entries };
    };
    if (existingEntries.size() >= 100) {
      Runtime.trap("Maximum 100 journal entries per user reached");
    };

    let newEntry : DreamJournalEntry = {
      id = newId;
      author = caller;
      authorName;
      title;
      content;
      timestamp = Time.now();
      isPublic;
      likes = Set.empty<Principal>();
    };

    let entriesMap = Map.empty<Nat, DreamJournalEntry>();
    entriesMap.add(newId, newEntry);
    let updatedEntries = existingEntries.clone();
    updatedEntries.add(newId, newEntry);
    dreamJournalEntries.add(caller, updatedEntries);
  };

  public query ({ caller }) func getMyJournalEntries() : async [DreamJournalEntryView] {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view journal entries");
    };

    switch (dreamJournalEntries.get(caller)) {
      case (null) { [] };
      case (?entries) { entries.values().map(func(entry) { convertDreamJournalEntryToView(entry) }).toArray() };
    };
  };

  public query ({ caller }) func getPublicJournalEntries() : async [DreamJournalEntryView] {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view journal entries");
    };

    let publicEntries = List.empty<DreamJournalEntry>();
    dreamJournalEntries.forEach(
      func(_author, entries) {
        entries.forEach(
          func(_id, entry) {
            if (entry.isPublic) { publicEntries.add(entry) };
          }
        );
      }
    );
    publicEntries.toArray().map(func(entry) { convertDreamJournalEntryToView(entry) });
  };

  public shared ({ caller }) func deleteJournalEntry(entryId : Nat) : async () {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete journal entries");
    };

    switch (dreamJournalEntries.get(caller)) {
      case (null) { Runtime.trap("No entries found") };
      case (?entries) {
        if (not entries.containsKey(entryId)) {
          Runtime.trap("Entry not found or you don't own this entry");
        };
        if (entries.size() == 1 and entries.containsKey(entryId)) {
          dreamJournalEntries.remove(caller);
        } else {
          let updatedEntries = entries.clone();
          updatedEntries.remove(entryId);
          dreamJournalEntries.add(caller, updatedEntries);
        };
      };
    };
  };

  public shared ({ caller }) func likeJournalEntry(entryId : Nat) : async () {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can like journal entries");
    };

    // Find entry by ID
    var found : ?(Principal, DreamJournalEntry) = null;
    dreamJournalEntries.forEach(
      func(author, entries) {
        switch (entries.get(entryId)) {
          case (null) {};
          case (?entry) { found := ?(author, entry) };
        };
      }
    );

    // Use found entry if available
    switch (found) {
      case (null) { Runtime.trap("Entry not found") };
      case (?(author, entry)) {
        let isAuthor = Principal.equal(caller, author);
        if (isAuthor) { Runtime.trap("Authors cannot like their own post") };
        if (entry.likes.contains(caller)) {
          entry.likes.remove(caller);
        } else {
          entry.likes.add(caller);
        };
        let updatedEntries = switch (dreamJournalEntries.get(author)) {
          case (null) { Map.empty<Nat, DreamJournalEntry>() };
          case (?entries) { entries };
        };
        updatedEntries.add(entryId, { entry with likes = entry.likes });
        dreamJournalEntries.add(author, updatedEntries);
      };
    };
  };

  // Star Dedications
  public shared ({ caller }) func dedicateStar(recipientName : Text, message : Text) : async () {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can dedicate stars");
    };

    let dedicatorName = switch (userProfiles.get(caller)) {
      case (null) { "Anonymous" };
      case (?profile) { profile.username };
    };
    let newId = getNextId(nextStarId, 0);

    // Check maximum limit
    let existingStars = switch (starDedicationsByPrincipal.get(caller)) {
      case (null) { Map.empty<Nat, StarDedication>() };
      case (?stars) { stars };
    };
    if (existingStars.size() >= 20) {
      Runtime.trap("Maximum 20 star dedications per user reached");
    };

    let newStar : StarDedication = {
      id = newId;
      dedicatorName;
      recipientName;
      message;
      timestamp = Time.now();
      dedicatedBy = caller;
    };

    let starsMap = Map.empty<Nat, StarDedication>();
    starsMap.add(newId, newStar);
    let updatedStars = existingStars.clone();
    updatedStars.add(newId, newStar);
    starDedicationsByPrincipal.add(caller, updatedStars);
  };

  public query ({ caller }) func getAllStars() : async [StarDedication] {
    if (not (Authorization.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view stars");
    };
    let stars = List.empty<StarDedication>();
    starDedicationsByPrincipal.forEach(
      func(_principal, starsMap) {
        starsMap.forEach(
          func(_id, star) {
            stars.add(star);
          }
        );
      }
    );
    stars.toArray();
  };
};
