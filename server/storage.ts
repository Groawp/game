import { 
  users, type User, type InsertUser,
  events, type Event, type InsertEvent,
  eventVotes, type EventVote, type InsertEventVote,
  logs, type Log, type InsertLog,
  type VoteDetail
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUsers(): Promise<User[]>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByName(name: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  deleteUser(id: number): Promise<boolean>;
  updateUserBalance(userId: number, balance: number): Promise<User | undefined>;
  
  // Event methods
  getEvents(): Promise<Event[]>;
  getEventById(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  deleteEvent(id: number): Promise<boolean>;
  updateEventVotes(id: number, votes: number): Promise<Event | undefined>;
  updateEvent(id: number, eventData: Partial<Event>): Promise<Event | undefined>;
  
  // Vote methods
  addVote(userId: number, eventId: number): Promise<boolean>;
  removeVote(userId: number, eventId: number): Promise<boolean>;
  getVotesByEvent(eventId: number): Promise<VoteDetail[]>;
  getVotesByUser(userId: number): Promise<VoteDetail[]>;
  getAllVotes(): Promise<VoteDetail[]>;
  updateVotePaymentStatus(userId: number, eventId: number, paid: boolean): Promise<boolean>;
  
  // Log methods
  getLogs(): Promise<Log[]>;
  createLog(log: InsertLog): Promise<Log>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUserById(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result.length ? result[0] : undefined;
  }

  async getUserByName(name: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.name}) = LOWER(${name})`);
    return result.length ? result[0] : undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values({
      name: user.name,
      password: user.password,
      isAdmin: user.isAdmin ?? false
    }).returning();
    return result[0];
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
    return result.length > 0;
  }
  
  async updateUserBalance(userId: number, balance: number): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set({ balance })
      .where(eq(users.id, userId))
      .returning();
    return result.length ? result[0] : undefined;
  }

  // Event methods
  async getEvents(): Promise<Event[]> {
    return await db.select().from(events);
  }

  async getEventById(id: number): Promise<Event | undefined> {
    const result = await db.select().from(events).where(eq(events.id, id));
    return result.length ? result[0] : undefined;
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const result = await db.insert(events).values(event).returning();
    return result[0];
  }

  async deleteEvent(id: number): Promise<boolean> {
    try {
      // First, delete all votes related to this event
      await db.delete(eventVotes).where(eq(eventVotes.eventId, id));
      
      // Then delete the event itself
      const result = await db.delete(events).where(eq(events.id, id)).returning({ id: events.id });
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting event:", error);
      return false;
    }
  }

  async updateEventVotes(id: number, votes: number): Promise<Event | undefined> {
    const result = await db
      .update(events)
      .set({ votes })
      .where(eq(events.id, id))
      .returning();
    return result.length ? result[0] : undefined;
  }
  
  async updateEvent(id: number, eventData: Partial<Event>): Promise<Event | undefined> {
    // Filter out undefined values and id from eventData
    const updateData: Partial<{
      title: string;
      description: string;
      date: string;
    }> = {};
    
    if (eventData.title !== undefined) updateData.title = eventData.title;
    if (eventData.description !== undefined) updateData.description = eventData.description;
    if (eventData.date !== undefined) updateData.date = eventData.date;
    
    // Only proceed if there are fields to update
    if (Object.keys(updateData).length === 0) {
      return await this.getEventById(id);
    }
    
    const result = await db
      .update(events)
      .set(updateData)
      .where(eq(events.id, id))
      .returning();
      
    return result.length ? result[0] : undefined;
  }

  // Vote methods
  async addVote(userId: number, eventId: number, additionalPlayers: number = 0): Promise<boolean> {
    const user = await this.getUserById(userId);
    const event = await this.getEventById(eventId);
    
    if (!user || !event) return false;
    
    // Handle null votes array in user
    let userVotes = user.votes || [];
    
    // Ensure userVotes is an array
    if (!Array.isArray(userVotes)) {
      userVotes = [];
    }
    
    // Check if user already voted for this event
    if (userVotes.includes(eventId)) return false;
    
    // Add vote to user
    const newVotes = [...userVotes, eventId];
    
    // Update participation count for badges
    const participationCount = (user.participationCount || 0) + 1;
    
    // Get current badges
    let badges = user.badges || [];
    if (!Array.isArray(badges)) {
      badges = [];
    }
    
    // Determine which badges to award based on new participation count
    // These match our client-side badge definitions
    const badgeIds = [
      { id: 'rookie', count: 1 },
      { id: 'regular', count: 5 },
      { id: 'enthusiast', count: 10 },
      { id: 'pro', count: 20 },
      { id: 'legend', count: 50 }
    ];
    
    // Add new badges that have been earned
    for (const badge of badgeIds) {
      if (participationCount >= badge.count && !badges.includes(badge.id)) {
        badges.push(badge.id);
      }
    }
    
    // Update user with new vote, participation count, and badges
    await db
      .update(users)
      .set({ 
        votes: newVotes,
        participationCount,
        badges
      })
      .where(eq(users.id, userId));
    
    // Record vote in event_votes table
    try {
      const voteRecord: InsertEventVote = {
        userId,
        eventId,
        additionalPlayers,
        paid: false, // Default to unpaid
      };
      await db.insert(eventVotes).values(voteRecord);
    } catch (error) {
      console.error("Error recording vote details:", error);
    }
    
    // Calculate total players (1 for the user + additional players)
    const totalPlayers = 1 + additionalPlayers;
    
    // Increment event vote count by total players
    await this.updateEventVotes(eventId, event.votes + totalPlayers);
    
    return true;
  }

  async removeVote(userId: number, eventId: number): Promise<boolean> {
    const user = await this.getUserById(userId);
    const event = await this.getEventById(eventId);
    
    if (!user || !event) return false;
    
    // Handle null votes array in user
    let userVotes = user.votes || [];
    
    // Ensure userVotes is an array
    if (!Array.isArray(userVotes)) {
      userVotes = [];
    }
    
    // Check if user has voted for this event
    if (!userVotes.includes(eventId)) return false;
    
    // Get vote details before removing to know how many players to subtract
    const voteDetails = await db
      .select()
      .from(eventVotes)
      .where(
        and(
          eq(eventVotes.userId, userId),
          eq(eventVotes.eventId, eventId)
        )
      ).limit(1);
    
    const additionalPlayers = voteDetails.length > 0 ? voteDetails[0].additionalPlayers || 0 : 0;
    
    // Calculate total players (1 for the user + additional players)
    const totalPlayers = 1 + additionalPlayers;
    
    // Remove vote from user
    const newVotes = userVotes.filter(id => id !== eventId);
    await db
      .update(users)
      .set({ votes: newVotes })
      .where(eq(users.id, userId));
    
    // Remove vote from event_votes table
    try {
      await db
        .delete(eventVotes)
        .where(
          and(
            eq(eventVotes.userId, userId),
            eq(eventVotes.eventId, eventId)
          )
        );
    } catch (error) {
      console.error("Error removing vote details:", error);
    }
    
    // Decrement event vote count by total players
    await this.updateEventVotes(eventId, event.votes - totalPlayers);
    
    return true;
  }
  
  // Methods to get vote details
  async getVotesByEvent(eventId: number): Promise<VoteDetail[]> {
    const event = await this.getEventById(eventId);
    if (!event) return [];
    
    const voteDetails = await db
      .select({
        eventId: eventVotes.eventId,
        eventTitle: events.title,
        userId: eventVotes.userId,
        userName: users.name,
        votedAt: eventVotes.votedAt,
        additionalPlayers: eventVotes.additionalPlayers,
        paid: eventVotes.paid,
      })
      .from(eventVotes)
      .innerJoin(users, eq(eventVotes.userId, users.id))
      .innerJoin(events, eq(eventVotes.eventId, events.id))
      .where(eq(eventVotes.eventId, eventId))
      .orderBy(desc(eventVotes.votedAt));
      
    return voteDetails;
  }
  
  async getVotesByUser(userId: number): Promise<VoteDetail[]> {
    const user = await this.getUserById(userId);
    if (!user) return [];
    
    const voteDetails = await db
      .select({
        eventId: eventVotes.eventId,
        eventTitle: events.title,
        userId: eventVotes.userId,
        userName: users.name,
        votedAt: eventVotes.votedAt,
        additionalPlayers: eventVotes.additionalPlayers,
        paid: eventVotes.paid,
      })
      .from(eventVotes)
      .innerJoin(users, eq(eventVotes.userId, users.id))
      .innerJoin(events, eq(eventVotes.eventId, events.id))
      .where(eq(eventVotes.userId, userId))
      .orderBy(desc(eventVotes.votedAt));
      
    return voteDetails;
  }
  
  async getAllVotes(): Promise<VoteDetail[]> {
    const voteDetails = await db
      .select({
        eventId: eventVotes.eventId,
        eventTitle: events.title,
        userId: eventVotes.userId,
        userName: users.name,
        votedAt: eventVotes.votedAt,
        additionalPlayers: eventVotes.additionalPlayers,
        paid: eventVotes.paid,
      })
      .from(eventVotes)
      .innerJoin(users, eq(eventVotes.userId, users.id))
      .innerJoin(events, eq(eventVotes.eventId, events.id))
      .orderBy(desc(eventVotes.votedAt));
      
    return voteDetails;
  }
  
  async updateVotePaymentStatus(userId: number, eventId: number, paid: boolean): Promise<boolean> {
    try {
      // Update the paid status in the event_votes table
      const result = await db
        .update(eventVotes)
        .set({ paid })
        .where(
          and(
            eq(eventVotes.userId, userId),
            eq(eventVotes.eventId, eventId)
          )
        )
        .returning();
      
      if (result.length === 0) {
        return false;
      }
      
      // Get user information
      const user = await this.getUserById(userId);
      const event = await this.getEventById(eventId);
      
      if (!user || !event) {
        return false;
      }
      
      // Create a log entry for the payment update
      const action = paid ? "Payment Made" : "Payment Cancelled";
      await this.createLog({
        user: user.name,
        action,
        details: `${action} for game: ${event.title}`
      });
      
      return true;
    } catch (error) {
      console.error("Error updating payment status:", error);
      return false;
    }
  }

  // Log methods
  async getLogs(): Promise<Log[]> {
    return await db.select().from(logs).orderBy(desc(logs.timestamp));
  }

  async createLog(log: InsertLog): Promise<Log> {
    const result = await db.insert(logs).values(log).returning();
    return result[0];
  }

  // Helper method to seed initial data if needed
  async seedInitialData(): Promise<void> {
    // Check if we have any users
    const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
    if (parseInt(userCount[0].count.toString()) === 0) {
      // Add admin user by default
      await db.insert(users).values({
        name: "Admin",
        password: "eventpass",
        isAdmin: true
      });
      
      // Add some sample events
      await db.insert(events).values([
        {
          title: "Monday Night Badminton",
          description: "Weekly badminton session for all levels. Bring your racket!",
          date: "Monday, April 15, 2024 6:00 PM",
          votes: 0,
        },
        {
          title: "Saturday Morning Badminton",
          description: "Weekend badminton session. All players welcome!",
          date: "Saturday, April 20, 2024 9:30 AM",
          votes: 0,
        },
        {
          title: "Thursday Evening Badminton",
          description: "After-work badminton session. Doubles and singles games.",
          date: "Thursday, April 18, 2024 7:00 PM",
          votes: 0,
        }
      ]);
    }
  }
}

export const storage = new DatabaseStorage();
