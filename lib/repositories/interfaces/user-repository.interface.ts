import type { User } from "@/lib/types"

/**
 * Repository interface for User persistence.
 * Implementations must be entity-type agnostic (no business rules).
 */
export interface IUserRepository {
  /**
   * Creates a new user and returns it with a generated ID.
   * @param data User data without ID
   * @returns The created user with ID
   */
  createUser(data: Omit<User, "id">): Promise<User>

  /**
   * Lists all users belonging to a specific entity.
   * @param entityId Entity identifier
   * @returns Array of users for the entity
   */
  listUsersByEntityId(entityId: string): Promise<User[]>

  /**
   * Retrieves all users.
   * @returns Array of all users
   */
  getAllUsers(): Promise<User[]>

  /**
   * Retrieves a user by ID.
   * @param id User identifier
   * @returns The user if found, null otherwise
   */
  getUserById(id: string): Promise<User | null>

  /**
   * Updates an existing user.
   * @param id User identifier
   * @param data Partial user data (id and entityId cannot be changed)
   * @returns The updated user if found, null otherwise
   */
  updateUser(id: string, data: Partial<Omit<User, "id" | "entityId">>): Promise<User | null>
}
