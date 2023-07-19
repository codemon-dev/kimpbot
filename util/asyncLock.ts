export class AsyncLock {
    private mutex: Promise<void>;
    private resolve: () => void = () => {}; // Default empty function
    public isLocked = false;
  
    constructor() {
        this.mutex = Promise.resolve();
        this.isLocked = false;
    }
  
    public async acquire(): Promise<void> {
        this.isLocked = true;
        await this.mutex;
        this.mutex = new Promise<void>((resolve) => {
            this.resolve = resolve;
        });
    }
  
    public release(): void {
        this.isLocked = false;
        this.resolve(); // Resolving the promise releases the lock
    }
}