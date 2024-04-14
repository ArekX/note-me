export interface Payload<Type extends string, Payload = never> {
    type: Type;
    payload: Payload;
}
