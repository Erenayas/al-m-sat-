/**
 * Form action'larının ortak dönüş tipi.
 *
 * Ayrı dosyada duruyor çünkü `"use server"` işaretli bir modül yalnızca async
 * fonksiyon export edebiliyor; sabit ya da nesne export etmek derlemeyi kırıyor.
 */
export interface ActionState {
  status: "idle" | "ok" | "error";
  message?: string;
  /** Alan bazlı hatalar; formda ilgili girdinin altında gösteriliyor */
  errors?: Record<string, string>;
}

export const IDLE: ActionState = { status: "idle" };
