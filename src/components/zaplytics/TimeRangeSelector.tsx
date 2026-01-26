import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TimeRange, CustomDateRange } from '@/types/zaplytics';
import { TIME_RANGES } from '@/types/zaplytics';
import { DateRangePicker } from './DateRangePicker';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
  customRange?: CustomDateRange;
  onCustomRangeChange?: (range?: CustomDateRange) => void;
  className?: string;
}

export function TimeRangeSelector({ 
  value, 
  onChange, 
  customRange, 
  onCustomRangeChange, 
  className 
}: TimeRangeSelectorProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <Select 
        value={value} 
        onValueChange={(newValue) => {
          onChange(newValue as TimeRange);
          // Clear custom range when switching to preset ranges
          if (newValue !== 'custom' && onCustomRangeChange) {
            onCustomRangeChange(undefined);
          }
        }}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select time range" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(TIME_RANGES).map(([key, config]) => (
            <SelectItem key={key} value={key}>
              {config.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {value === 'custom' && onCustomRangeChange && (
        <DateRangePicker 
          value={customRange}
          onChange={onCustomRangeChange}
        />
      )}
    </div>
  );
}

interface TimeRangeButtonsProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
  customRange?: CustomDateRange;
  onCustomRangeChange?: (range?: CustomDateRange) => void;
  className?: string;
}

export function TimeRangeButtons({ 
  value, 
  onChange, 
  customRange, 
  onCustomRangeChange, 
  className 
}: TimeRangeButtonsProps) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex flex-wrap gap-2">
        {Object.entries(TIME_RANGES).map(([key, config]) => (
          <Button
            key={key}
            variant={value === key ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              onChange(key as TimeRange);
              // Clear custom range when switching to preset ranges
              if (key !== 'custom' && onCustomRangeChange) {
                onCustomRangeChange(undefined);
              }
            }}
          >
            {config.label}
          </Button>
        ))}
      </div>
      
      {value === 'custom' && onCustomRangeChange && (
        <DateRangePicker 
          value={customRange}
          onChange={onCustomRangeChange}
          className="w-fit"
        />
      )}
    </div>
  );
}