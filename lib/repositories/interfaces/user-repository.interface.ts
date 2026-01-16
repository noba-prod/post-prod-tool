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
}
