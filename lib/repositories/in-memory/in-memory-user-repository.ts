import type { User } from "@/lib/types"
import type { IUserRepository } from "../interfaces/user-repository.interface"

/**
 * Generates a unique ID.
 * Uses crypto.randomUUID() if available, falls back to timestamp + random.
 */
function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Storage key for localStorage persistence.
 */
const STORAGE_KEY = "noba_users"

/**
 * Module-level storage for users.
 * Persists across calls within the same session and across page refreshes via localStorage.
 */
const userStore = new Map<string, User>()

/**
 * Load users from localStorage into memory.
 */
function loadFromStorage(): void {
  if (typeof window === "undefined") return
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const users: User[] = JSON.parse(stored)
      users.forEach((u) => {
        userStore.set(u.id, u)
      })
    }
  } catch (error) {
    console.warn("Failed to load users from localStorage:", error)
  }
}

/**
 * Save users from memory to localStorage.
 */
function saveToStorage(): void {
  if (typeof window === "undefined") return
  try {
    const users = Array.from(userStore.values())
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users))
  } catch (error) {
    console.warn("Failed to save users to localStorage:", error)
  }
}

// Load from localStorage on module initialization
if (typeof window !== "undefined") {
  loadFromStorage()
}

/**
 * In-memory implementation of IUserRepository.
 * Used for development and testing without a database.
 * Persists data to localStorage automatically.
 */
export class InMemoryUserRepository implements IUserRepository {
  /**
   * Creates a new user and stores it in memory.
   * @param data User data without ID
   * @returns The created user with generated ID
   */
  async createUser(data: Omit<User, "id">): Promise<User> {
    const id = generateId()
    const user: User = { id, ...data }
    userStore.set(id, user)
    saveToStorage()
    return user
  }

  /**
   * Lists all users belonging to a specific entity.
   * @param entityId Entity identifier
   * @returns Array of users for the entity
   */
  async listUsersByEntityId(entityId: string): Promise<User[]> {
    const users: User[] = []
    for (const user of userStore.values()) {
      if (user.entityId === entityId) {
        users.push(user)
      }
    }
    return users
  }

  /**
   * Retrieves all users from memory.
   * @returns Array of all users
   */
  async getAllUsers(): Promise<User[]> {
    return Array.from(userStore.values())
  }

  /**
   * Retrieves a user by ID from memory.
   * @param id User identifier
   * @returns The user if found, null otherwise
   */
  async getUserById(id: string): Promise<User | null> {
    return userStore.get(id) || null
  }

  /**
   * Updates an existing user in memory.
   * Preserves id and entityId, updates other fields.
   * @param id User identifier
   * @param data Partial user data (id and entityId cannot be changed)
   * @returns The updated user if found, null otherwise
   */
  async updateUser(id: string, data: Partial<Omit<User, "id" | "entityId">>): Promise<User | null> {
    const existing = userStore.get(id)
    if (!existing) {
      return null
    }

    const updated: User = {
      ...existing,
      ...data,
      // Preserve immutable fields
      id: existing.id,
      entityId: existing.entityId,
    }

    userStore.set(id, updated)
    saveToStorage()
    return updated
  }

  /**
   * Deletes a user from memory (removes from team/entity list).
   * @param id User identifier
   * @returns true if the user was found and deleted, false otherwise
   */
  async deleteUser(id: string): Promise<boolean> {
    const had = userStore.has(id)
    userStore.delete(id)
    if (had) saveToStorage()
    return had
  }

  /**
   * Resets the in-memory store and localStorage.
   * Useful for testing and development.
   */
  static reset(): void {
    userStore.clear()
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  /**
   * Returns all stored users (static version).
   * Useful for debugging.
   */
  static getAll(): User[] {
    return Array.from(userStore.values())
  }
}
