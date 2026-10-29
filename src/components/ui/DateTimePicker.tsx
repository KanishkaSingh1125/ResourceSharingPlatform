import { Calendar, Clock } from 'lucide-react'

export interface DateTimePickerProps {
  label?: string
  date: string
  timeSlot?: string
  onChangeDate: (date: string) => void
  onChangeTimeSlot?: (slot: string) => void
  availableSlots?: string[]
  minDate?: string
  maxDate?: string
  isRequired?: boolean
  helperText?: string
  className?: string
}

const defaultTimeSlots = [
  '09:00 - 10:00',
  '10:00 - 11:00',
  '11:00 - 12:00',
  '13:00 - 14:00',
  '14:00 - 15:00',
  '15:00 - 16:00',
  '16:00 - 17:00',
]

export function DateTimePicker({
  label,
  date,
  timeSlot,
  onChangeDate,
  onChangeTimeSlot,
  availableSlots = defaultTimeSlots,
  minDate,
  maxDate,
  isRequired,
  helperText,
  className = '',
}: DateTimePickerProps) {
  return (
    <div className={`space-y-3.5 w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-neutral-800 flex items-center gap-1">
          {label}
          {isRequired && <span className="text-red-500 font-bold">*</span>}
        </label>
      )}

      {/* Date Picker Input */}
      <div>
        <span className="mb-1 block text-xs font-medium text-neutral-600">Select Date</span>
        <div className="relative flex items-center">
          <div className="pointer-events-none absolute left-3 flex items-center text-neutral-400">
            <Calendar className="h-4 w-4" />
          </div>
          <input
            type="date"
            value={date}
            min={minDate}
            max={maxDate}
            onChange={(e) => onChangeDate(e.target.value)}
            className="w-full rounded-md border border-neutral-300 bg-white py-2 pl-9 pr-3 text-sm text-neutral-900 transition-colors focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          />
        </div>
      </div>

      {/* Time Slot Selector */}
      {onChangeTimeSlot && (
        <div>
          <span className="mb-1.5 flex items-center gap-1 text-xs font-medium text-neutral-600">
            <Clock className="h-3.5 w-3.5 text-neutral-400" />
            Select Time Slot
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {availableSlots.map((slot) => {
              const isSelected = slot === timeSlot
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => onChangeTimeSlot(slot)}
                  className={`rounded-md border py-1.5 px-2 text-xs font-medium transition-all text-center ${
                    isSelected
                      ? 'border-brand-600 bg-brand-50 text-brand-700 font-semibold shadow-2xs'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300'
                  }`}
                >
                  {slot}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {helperText && <p className="text-xs text-neutral-500">{helperText}</p>}
    </div>
  )
}

