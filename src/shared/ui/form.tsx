// フォームの部品。shadcn の CLI で追加したものを、このアプリの見た目に合わせて直している。
// react-hook-form で入力の状態を持ち、zod のスキーマで入力をチェックする（DESIGN.md「4. コンポーネントの使い分け」）。
"use client";

import * as React from "react";
import { cn } from "@/shared/ui/utils";
import type { Label as LabelPrimitive } from "radix-ui";
import { Slot } from "radix-ui";
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { Label } from "@/shared/ui/label";

// フォーム全体。useForm() の戻り値を渡すと、中の部品から入力の状態を読めるようになる。
const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

// 1 つの入力項目。name で react-hook-form のどの項目かを指定し、render で入力欄を描く。
const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

// 今いる入力項目の名前・エラー・部品どうしを結び付ける ID を取り出す。
const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState } = useFormContext();
  const formState = useFormState({ name: fieldContext.name });
  const fieldState = getFieldState(fieldContext.name, formState);

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>");
  }

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue);

// ラベル・入力欄・エラーの文言をまとめる枠。
function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div data-slot="form-item" className={cn("grid gap-1.5", className)} {...props} />
    </FormItemContext.Provider>
  );
}

// 入力欄のラベル。押すと対応する入力欄にフォーカスが移る。
// エラーの色（destructive）は入力欄の下の文言と入力欄の枠にだけ使うため、ラベルの色は変えない。
function FormLabel({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  const { formItemId } = useFormField();

  return (
    <Label
      data-slot="form-label"
      className={cn("text-xs text-muted-foreground", className)}
      htmlFor={formItemId}
      {...props}
    />
  );
}

// 入力欄を包み、エラーがあるときに aria-invalid を付けて枠を赤くする。読み上げ用にエラーの文言とも結び付ける。
function FormControl({ ...props }: React.ComponentProps<typeof Slot.Root>) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

  return (
    <Slot.Root
      data-slot="form-control"
      id={formItemId}
      aria-describedby={!error ? `${formDescriptionId}` : `${formDescriptionId} ${formMessageId}`}
      aria-invalid={!!error}
      {...props}
    />
  );
}

// 入力欄の補足の説明。
function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { formDescriptionId } = useFormField();

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

// 入力欄の下に出すエラーの文言。エラーが無ければ何も出さない。
function FormMessage({ className, ...props }: React.ComponentProps<"p">) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message ?? "") : props.children;

  if (!body) {
    return null;
  }

  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      role="alert"
      className={cn("text-xs text-destructive", className)}
      {...props}
    >
      {body}
    </p>
  );
}

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
};
