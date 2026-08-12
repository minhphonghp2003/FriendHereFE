import { z } from "zod";

export const createGroupChatSchema = (myUserId: number) =>
  z.object({
    name: z.string().trim().max(100, "Tên nhóm tối đa 100 ký tự").optional(),
    memberIds: z
      .array(z.number().int().positive())
      .min(2, "Chọn ít nhất 2 thành viên")
      .refine((ids) => new Set(ids).size === ids.length, "Thành viên không được trùng lặp")
      .refine((ids) => !ids.includes(myUserId), "Không thể thêm chính bạn vào nhóm"),
  });

export type CreateGroupChatFormData = z.infer<ReturnType<typeof createGroupChatSchema>>;

export const renameGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tên nhóm không được để trống")
    .max(100, "Tên nhóm tối đa 100 ký tự"),
});

export type RenameGroupFormData = z.infer<typeof renameGroupSchema>;
