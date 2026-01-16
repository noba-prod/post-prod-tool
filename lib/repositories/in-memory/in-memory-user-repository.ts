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
 * Module-level storage for users.
 * Persists across calls within the same session.
 */
const userStore = new Map<string, User>()

/**
 * In-memory implementation of IUserRepository.
 * Used for development and testing without a database.
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
   * Resets the in-memory store.
   * Useful for testing and development.
   */
  static reset(): void {
    userStore.clear()
  }

  /**
   * Returns all stored users (static version).
   * Useful for debugging.
   */
  static getAll(): User[] {
    return Array.from(userStore.values())
  }
}
