import { BackgroundService } from "$workers/services/background-service.ts";

export type Listener<
    T = unknown,
    Name extends string = string,
    MessageType extends string = string,
> = (
    message: ChannelMessage<T, Name, MessageType>,
) => void;

export interface ChannelMessage<
    T = unknown,
    Name extends string = string,
    MessageType extends string = string,
> {
    from: Name;
    to: Name;
    type: MessageType;
    message: T;
}

export interface Channel<Name extends string = string, T = unknown> {
    name: Name;
    send: (message: ChannelMessage<T, Name>) => void;
    receive: (message: ChannelMessage<T, Name>) => void;
    onReceive: (listener: Listener<T>) => void;
}

interface AppChannel extends Channel {
    connectChannel: (channel: Channel) => void;
}

export const createAppChannel = (): AppChannel => {
    const listeners = new Set<Listener>();
    const connectedChannels = new Set<Channel>();

    const receive = <T, Name extends string>(
        message: ChannelMessage<T, Name>,
    ) => {
        for (const listener of listeners) {
            listener(message);
        }
    };

    return {
        name: "app",
        connectChannel: (channel) => {
            connectedChannels.add(channel);
            channel.onReceive(receive);
        },
        send: (message) => {
            for (const channel of connectedChannels) {
                channel.receive(message);
            }
        },
        receive,
        onReceive: (listener) => {
            listeners.add(listener as Listener);
        },
    };
};

interface RoutingChannel extends Channel {
    connectChannel: (channel: Channel) => void;
}

export const createRoutingChannel = <Name extends string = string>(
    name: Name,
): RoutingChannel => {
    const connectedChannels = new Set<Channel>();

    const send = <T, Name extends string>(
        message: ChannelMessage<T, Name>,
    ) => {
        for (const channel of connectedChannels) {
            if (channel.name === message.from) {
                continue;
            }

            if (channel.name === message.to || message.to === "*") {
                channel.send(message);
            }
        }
    };

    return {
        name,
        connectChannel: (channel) => {
            connectedChannels.add(channel);
        },
        send,
        receive: send,
        onReceive: () => {
        },
    };
};

interface ServiceChannel extends Channel {
    connectReceiver: (channel: Channel) => void;
}

export const createServiceChannel = (
    service: BackgroundService,
): ServiceChannel => {
    const listeners = new Set<Listener>();
    const connectedChannels = new Set<Channel>();

    const receive = <T, Name extends string>(
        message: ChannelMessage<T, Name>,
    ) => {
        for (const channel of connectedChannels) {
            channel.receive(message);
        }

        for (const listener of listeners) {
            listener(message);
        }
    };

    service.onMessage((message) => {
        receive(message as ChannelMessage);
    });

    return {
        name: service.name,
        connectReceiver: (channel) => {
            connectedChannels.add(channel);
        },
        send: (message) => {
            service.send(message);
        },
        receive,
        onReceive: (listener) => {
            listeners.add(listener as Listener);
        },
    };
};

export interface WorkerChannel extends Channel {
    addOneTimeListener: <T = unknown, Name extends string = string>(
        type: string,
        listener: Listener<T, Name>,
    ) => void;
    listen: <T = unknown, Name extends string = string>(
        type: string,
        listener: Listener<T, Name>,
    ) => void;
}

export const createWorkerChannel = <Name extends string = string>(
    name: Name,
    worker: DedicatedWorkerGlobalScope,
): WorkerChannel => {
    const listeners = new Set<Listener>();

    const receive = <T, Name extends string>(
        message: ChannelMessage<T, Name>,
    ) => {
        for (const listener of listeners) {
            listener(message);
        }
    };

    worker.addEventListener("message", (event) => {
        const message = JSON.parse(event.data);

        receive(message);
    });

    return {
        name,
        send: (message) => {
            worker.postMessage(JSON.stringify(message));
        },
        receive,
        onReceive: (listener) => {
            listeners.add(listener as Listener);
        },
        listen: (type, listener) => {
            listeners.add(createMessageTypeListener(type, listener));
        },
        addOneTimeListener: (type, listener) => {
            const oneTimeListener = createMessageTypeListener(
                type,
                (message) => {
                    (listener as Listener)(message);
                    listeners.delete(oneTimeListener);
                },
            );

            listeners.add(oneTimeListener);
        },
    };
};

export const createMessageTypeListener = <
    T = unknown,
    Name extends string = string,
    MessageType extends string = string,
>(
    type: MessageType,
    listener: Listener<T, Name, MessageType>,
): Listener => {
    return ((message: ChannelMessage<T, Name, MessageType>) => {
        if (message.type === type) {
            listener(message);
        }
    }) as Listener;
};
