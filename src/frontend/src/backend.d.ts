import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface WorldEventView {
    id: bigint;
    startTime: bigint;
    title: string;
    endTime: bigint;
    createdBy: string;
    zone: string;
    description: string;
    attendees: Array<Principal>;
}
export interface DreamJournalEntryView {
    id: bigint;
    title: string;
    content: string;
    authorName: string;
    author: Principal;
    likes: Array<Principal>;
    timestamp: bigint;
    isPublic: boolean;
}
export interface ChatMessage {
    content: string;
    sender: string;
    timestamp: bigint;
}
export interface StarDedication {
    id: bigint;
    message: string;
    timestamp: bigint;
    dedicatorName: string;
    recipientName: string;
    dedicatedBy: Principal;
}
export interface Group {
    creator: Principal;
    members: Array<Principal>;
    name: string;
    description: string;
}
export interface AvatarConfig {
    accessory: string;
    outfit: string;
    color: string;
    bodyType: string;
}
export interface UserProfile {
    bio: string;
    username: string;
    joinDate: bigint;
    totalScore: bigint;
    currentZone: string;
    avatar: AvatarConfig;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    acceptFriendRequest(from: Principal): Promise<void>;
    addJournalEntry(title: string, content: string, isPublic: boolean): Promise<void>;
    addQuest(title: string, description: string, rewardPoints: bigint): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    completeQuest(questId: bigint): Promise<void>;
    createEvent(title: string, description: string, zone: string, startTime: bigint, endTime: bigint): Promise<void>;
    createGroup(name: string, description: string): Promise<void>;
    createProfile(username: string, bio: string): Promise<void>;
    dedicateStar(recipientName: string, message: string): Promise<void>;
    deleteJournalEntry(entryId: bigint): Promise<void>;
    getActiveEvents(): Promise<Array<WorldEventView>>;
    getAllEvents(): Promise<Array<WorldEventView>>;
    getAllGroups(): Promise<Array<Group>>;
    getAllStars(): Promise<Array<StarDedication>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getLeaderboard(): Promise<Array<UserProfile>>;
    getMyJournalEntries(): Promise<Array<DreamJournalEntryView>>;
    getProfile(user: Principal): Promise<UserProfile>;
    getPublicJournalEntries(): Promise<Array<DreamJournalEntryView>>;
    getUnreadNotificationCount(): Promise<bigint>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getZoneMessages(zone: string): Promise<Array<ChatMessage>>;
    isCallerAdmin(): Promise<boolean>;
    joinGroup(groupName: string): Promise<void>;
    likeJournalEntry(entryId: bigint): Promise<void>;
    markAllNotificationsRead(): Promise<void>;
    rsvpEvent(eventId: bigint): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveCallerUserProfileBook(input: UserProfile): Promise<UserProfile>;
    sendFriendRequest(to: Principal): Promise<void>;
    sendMessage(content: string): Promise<void>;
    startQuest(questId: bigint): Promise<void>;
    teleport(zone: string): Promise<void>;
    updateAvatar(avatar: AvatarConfig): Promise<void>;
}
