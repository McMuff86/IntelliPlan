export interface WorkingTimeTemplate {
  id: string;
  name: string;
  user_id: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkingTimeSlot {
  id: string;
  template_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface WorkingTimeSlotInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface CreateTemplateDTO {
  name: string;
  isDefault?: boolean;
  slots: WorkingTimeSlotInput[];
}

export interface WorkingTimeTemplateResponse {
  id: string;
  name: string;
  userId: string;
  isDefault: boolean;
  slots: WorkingTimeSlotResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkingTimeSlotResponse {
  id: string;
  templateId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export const toSlotResponse = (slot: WorkingTimeSlot): WorkingTimeSlotResponse => ({
  id: slot.id,
  templateId: slot.template_id,
  dayOfWeek: slot.day_of_week,
  startTime: slot.start_time,
  endTime: slot.end_time,
});

export const toTemplateResponse = (
  template: WorkingTimeTemplate,
  slots: WorkingTimeSlot[]
): WorkingTimeTemplateResponse => ({
  id: template.id,
  name: template.name,
  userId: template.user_id,
  isDefault: template.is_default,
  slots: slots.map(toSlotResponse),
  createdAt: template.created_at,
  updatedAt: template.updated_at,
});
