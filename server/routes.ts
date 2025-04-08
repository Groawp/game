import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertEventSchema, insertLogSchema } from "@shared/schema";
import { z } from "zod";

const PREDEFINED_PASSWORD = "eventpass";

export async function registerRoutes(app: Express): Promise<Server> {
  // API router with prefix /api
  const apiRouter = express.Router();
  
  // User routes
  apiRouter.get("/users", async (req: Request, res: Response) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Error fetching users" });
    }
  });
  
  apiRouter.post("/users", async (req: Request, res: Response) => {
    try {
      const data = insertUserSchema.parse(req.body);
      
      // Check if predefined password is correct
      if (data.password !== PREDEFINED_PASSWORD) {
        return res.status(400).json({ message: "Invalid password" });
      }
      
      // Check if username already exists
      const existingUser = await storage.getUserByName(data.name);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }
      
      const user = await storage.createUser(data);
      
      // Add log entry for user registration
      await storage.createLog({
        user: user.name,
        action: "REGISTER",
        details: "New user registered"
      });
      
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Error creating user" });
    }
  });
  
  apiRouter.post("/login", async (req: Request, res: Response) => {
    try {
      const { name, password } = req.body;
      
      if (!name || !password) {
        return res.status(400).json({ message: "Name and password are required" });
      }
      
      // Check if predefined password is correct
      if (password !== PREDEFINED_PASSWORD) {
        return res.status(400).json({ message: "Invalid password" });
      }
      
      // Check if user exists
      const user = await storage.getUserByName(name);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Add log entry for user login
      await storage.createLog({
        user: user.name,
        action: "LOGIN",
        details: "User logged in"
      });
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Error logging in" });
    }
  });
  
  apiRouter.delete("/users/:id", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Check if user exists
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Delete user
      await storage.deleteUser(userId);
      
      // Add log entry for user deletion
      await storage.createLog({
        user: "Admin",
        action: "REMOVE",
        details: `Removed user: ${user.name}`
      });
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting user" });
    }
  });
  
  // Event routes
  apiRouter.get("/events", async (req: Request, res: Response) => {
    try {
      const events = await storage.getEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Error fetching events" });
    }
  });
  
  apiRouter.post("/events", async (req: Request, res: Response) => {
    try {
      const data = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(data);
      
      // Add log entry for event creation
      await storage.createLog({
        user: "Admin",
        action: "ADD",
        details: `Added new event: ${event.title}`
      });
      
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Error creating event" });
    }
  });
  
  apiRouter.delete("/events/:id", async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.id);
      
      // Check if event exists
      const event = await storage.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Delete event
      await storage.deleteEvent(eventId);
      
      // Add log entry for event deletion
      await storage.createLog({
        user: "Admin",
        action: "REMOVE",
        details: `Removed event: ${event.title}`
      });
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting event" });
    }
  });
  
  // Voting routes
  apiRouter.post("/vote", async (req: Request, res: Response) => {
    try {
      const { userId, eventId, additionalPlayers = 0 } = req.body;
      
      if (!userId || !eventId) {
        return res.status(400).json({ message: "User ID and Event ID are required" });
      }
      
      // Check if user and event exist
      const user = await storage.getUserById(userId);
      const event = await storage.getEventById(eventId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Add vote with additional players
      const result = await storage.addVote(userId, eventId, additionalPlayers);
      
      if (!result) {
        return res.status(400).json({ message: "User already voted for this event" });
      }
      
      const players = additionalPlayers > 0 
        ? ` with ${additionalPlayers} additional player${additionalPlayers > 1 ? 's' : ''}`
        : '';
      
      // Add log entry for voting
      await storage.createLog({
        user: user.name,
        action: "VOTE",
        details: `Signed up for ${event.title}${players}`
      });
      
      const updatedUser = await storage.getUserById(userId);
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Error adding vote" });
    }
  });
  
  apiRouter.post("/unvote", async (req: Request, res: Response) => {
    try {
      const { userId, eventId } = req.body;
      
      if (!userId || !eventId) {
        return res.status(400).json({ message: "User ID and Event ID are required" });
      }
      
      // Check if user and event exist
      const user = await storage.getUserById(userId);
      const event = await storage.getEventById(eventId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Remove vote
      const result = await storage.removeVote(userId, eventId);
      
      if (!result) {
        return res.status(400).json({ message: "User has not voted for this event" });
      }
      
      // Add log entry for unvoting
      await storage.createLog({
        user: user.name,
        action: "UNVOTE",
        details: `Cancelled signup for ${event.title}`
      });
      
      const updatedUser = await storage.getUserById(userId);
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Error removing vote" });
    }
  });
  
  // Log routes
  apiRouter.get("/logs", async (req: Request, res: Response) => {
    try {
      const logs = await storage.getLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Error fetching logs" });
    }
  });
  
  // Vote details routes for admin
  apiRouter.get("/votes", async (req: Request, res: Response) => {
    try {
      // Check if user is admin (typically would use auth middleware)
      const adminId = req.query.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Unauthorized - Admin ID required" });
      }
      
      const admin = await storage.getUserById(parseInt(adminId as string));
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ message: "Forbidden - Admin access required" });
      }
      
      const votes = await storage.getAllVotes();
      res.json(votes);
    } catch (error) {
      res.status(500).json({ message: "Error fetching vote details" });
    }
  });
  
  apiRouter.get("/votes/event/:id", async (req: Request, res: Response) => {
    try {
      // Check if user is logged in
      const userId = req.query.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - User ID required" });
      }
      
      // Get user
      const user = await storage.getUserById(parseInt(userId as string));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const eventId = parseInt(req.params.id);
      const votes = await storage.getVotesByEvent(eventId);
      res.json(votes);
    } catch (error) {
      console.error("Error fetching vote details:", error);
      res.status(500).json({ message: "Error fetching vote details" });
    }
  });
  
  apiRouter.get("/votes/user/:id", async (req: Request, res: Response) => {
    try {
      // Check if user is admin (typically would use auth middleware)
      const adminId = req.query.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Unauthorized - Admin ID required" });
      }
      
      const admin = await storage.getUserById(parseInt(adminId as string));
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ message: "Forbidden - Admin access required" });
      }
      
      const userId = parseInt(req.params.id);
      const votes = await storage.getVotesByUser(userId);
      res.json(votes);
    } catch (error) {
      res.status(500).json({ message: "Error fetching vote details" });
    }
  });
  
  // Update an event
  apiRouter.patch("/events/:id", async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.id);
      
      // Check if event exists
      const event = await storage.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Check if user has admin privileges
      const adminId = req.query.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Unauthorized - Admin ID required" });
      }
      
      const user = await storage.getUserById(parseInt(adminId as string));
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Unauthorized - Admin access required" });
      }
      
      const { title, description, date } = req.body;
      
      // Create update data object
      const updateData: {
        title?: string;
        description?: string;
        date?: string;
      } = {};
      
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (date !== undefined) updateData.date = date;
      
      const updatedEvent = await storage.updateEvent(eventId, updateData);
      
      if (updatedEvent) {
        // Add log entry for event update
        await storage.createLog({
          user: user.name,
          action: "UPDATE",
          details: `Updated event: ${updatedEvent.title}`,
          timestamp: new Date()
        });
        
        return res.json(updatedEvent);
      }
      
      return res.status(500).json({ message: "Failed to update event" });
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(500).json({ message: "Error updating event" });
    }
  });

  // Update payment status for a registration
  apiRouter.post("/payment/status", async (req: Request, res: Response) => {
    try {
      const { userId, eventId, paid } = req.body;
      
      if (typeof userId === 'undefined' || typeof eventId === 'undefined' || typeof paid === 'undefined') {
        return res.status(400).json({ message: "UserId, eventId and paid status are required" });
      }
      
      // Check if user is admin
      const adminId = req.query.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Unauthorized - Admin ID required" });
      }
      
      const admin = await storage.getUserById(parseInt(adminId as string));
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ message: "Forbidden - Admin access required" });
      }
      
      const result = await storage.updateVotePaymentStatus(userId, eventId, paid);
      
      if (result) {
        res.status(200).json({ message: `Payment status updated to ${paid ? 'paid' : 'unpaid'}` });
      } else {
        res.status(404).json({ message: "Registration not found or could not be updated" });
      }
    } catch (error) {
      console.error("Error updating payment status:", error);
      res.status(500).json({ message: "Error updating payment status" });
    }
  });
  
  // Update user balance
  apiRouter.post("/user/balance", async (req: Request, res: Response) => {
    try {
      const { userId, balance } = req.body;
      
      if (typeof userId === 'undefined' || typeof balance === 'undefined') {
        return res.status(400).json({ message: "UserId and balance are required" });
      }
      
      // Check if user is admin
      const adminId = req.query.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Unauthorized - Admin ID required" });
      }
      
      const admin = await storage.getUserById(parseInt(adminId as string));
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ message: "Forbidden - Admin access required" });
      }
      
      // Check if user exists
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const updatedUser = await storage.updateUserBalance(userId, balance);
      
      if (updatedUser) {
        // Add log entry for balance update
        await storage.createLog({
          user: admin.name,
          action: "UPDATE",
          details: `Updated ${user.name}'s balance to ${balance} points`,
          timestamp: new Date()
        });
        
        res.status(200).json({ message: "Balance updated successfully", user: updatedUser });
      } else {
        res.status(400).json({ message: "Failed to update balance" });
      }
    } catch (error) {
      console.error("Error updating balance:", error);
      res.status(500).json({ message: "Error updating balance" });
    }
  });

  // Register API router
  app.use("/api", apiRouter);
  
  const httpServer = createServer(app);
  
  return httpServer;
}
