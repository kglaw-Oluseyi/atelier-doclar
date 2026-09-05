export interface DeliveryStore {
  has(deliveryId: string): boolean;
  remember(deliveryId: string): void;
}

export class MemoryDeliveryStore implements DeliveryStore {
  private readonly seen = new Set<string>();

  has(deliveryId: string): boolean {
    return this.seen.has(deliveryId);
  }

  remember(deliveryId: string): void {
    this.seen.add(deliveryId);
  }
}
