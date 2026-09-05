export type DomainEvent = {
  type: string;
  payload: Record<string, any>;
  timestamp: Date;
};
