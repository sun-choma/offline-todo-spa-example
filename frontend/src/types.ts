export type Primitive = string | number | boolean;

type NotSerializable = (() => void) | Promise<unknown> | symbol;
export type Serializable<Type> = {
  [Key in keyof Type]: Type[Key] extends NotSerializable
    ? never
    : Type[Key] extends object
      ? Serializable<Type[Key]>
      : Type[Key];
};
