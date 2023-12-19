export interface Payload<Type extends string, Payload> {
  type: Type;
  payload: Payload;
}
