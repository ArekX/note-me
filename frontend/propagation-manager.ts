type ReadyFn = () => void;

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

export const runCriticalJob = (job: () => void) => {
    const ticket = createPropagationTicket();
    try {
        job();
        consumePropagationTicket(ticket);
    } catch (e) {
        consumePropagationTicket(ticket);
        throw e;
    }
};

export const createPropagationTicket = (): TicketId => {
    const ticket = crypto.randomUUID();
    propagationTickets.add(ticket);
    return ticket;
};

export const consumePropagationTicket = (ticketId: TicketId) => {
    propagationTickets.delete(ticketId);

    if (propagationTickets.size === 0) {
        for (const method of pendingReadyMethods) {
            method();
        }

        pendingReadyMethods.clear();
    }
};
