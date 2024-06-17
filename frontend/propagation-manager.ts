type ReadyFn = () => Promise<void>;

const propagationTickets = new Set<TicketId>();

const pendingReadyMethods = new Set<ReadyFn>();

export type TicketId = `${string}-${string}-${string}-${string}-${string}`;

export const runOnReady = (method: ReadyFn) => {
    if (propagationTickets.size === 0) {
        method();
        return;
    }

    pendingReadyMethods.add(method);
};

export const runCriticalJob = async (job: () => Promise<void>) => {
    const ticket = createPropagationTicket();
    try {
        await job();
        await consumePropagationTicket(ticket);
    } catch (e) {
        await consumePropagationTicket(ticket);
        throw e;
    }
};

export const createPropagationTicket = (): TicketId => {
    const ticket = crypto.randomUUID();
    propagationTickets.add(ticket);
    return ticket;
};

export const consumePropagationTicket = async (ticketId: TicketId) => {
    propagationTickets.delete(ticketId);

    if (propagationTickets.size === 0) {
        for (const method of pendingReadyMethods) {
            await method();
        }

        pendingReadyMethods.clear();
    }
};
