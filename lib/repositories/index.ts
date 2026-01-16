// Interfaces
export type { IEntityRepository } from "./interfaces/entity-repository.interface"
export type { IUserRepository } from "./interfaces/user-repository.interface"

// In-memory implementations
export { InMemoryEntityRepository } from "./in-memory/in-memory-entity-repository"
export { InMemoryUserRepository } from "./in-memory/in-memory-user-repository"
