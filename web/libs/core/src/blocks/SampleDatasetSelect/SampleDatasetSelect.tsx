import { Select, SelectContent, SelectItem, SelectTrigger } from "@humansignal/shad/components/ui/select";
import { useCallback, useMemo } from "react";
import { IconWarning } from "@humansignal/ui/assets/icons";

type Sample = {
  title: string;
  url: string;
  description: string;
  label_config?: string;
};

export function SampleDatasetSelect({
  samples,
  sample,
  onSampleApplied,
  warningMessage,
}: {
  samples: Sample[];
  sample?: Sample;
  onSampleApplied: (sample?: Sample) => void;
  warningMessage?: string;
}) {
  const title = useMemo(() => {
    return sample?.title ?? "Select sample";
  }, [sample]);

  const onSelect = useCallback(
    (value: string) => {
      onSampleApplied(samples.find((s) => s.url === value));
    },
    [samples, onSampleApplied],
  );

  return (
    <div className="flex flex-row items-start gap-4">
      <div className="flex gap-3 items-center">
        <span className="text-lsNeutralContentSubtler">or use a sample dataset</span>
        <Select value={sample?.url ?? undefined} onValueChange={onSelect}>
          <SelectTrigger className="h-10 min-w-52 rounded-sm border-lsNeutralBorderBold data-[placeholder]:text-[#000] text-[16px] [&_svg]:stroke-[#000]">
            {title}
          </SelectTrigger>
          <SelectContent className="z-99999 min-w-90">
            {samples.map((sample) => (
              <SelectItem value={sample.url} key={sample.url}>
                <div className=" font-bold">{sample.title}</div>
                <div className="mt-2">{sample.description}</div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {warningMessage && (
        <div className="flex items-start gap-2 p-2 text-red-600 bg-red-50 border border-red-200 rounded-sm max-w-xs">
          <IconWarning className="w-5 h-5 fill-red-600 flex-shrink-0 mt-0.5" />
          <span className="text-sm leading-tight">{warningMessage}</span>
        </div>
      )}
    </div>
  );
}
