"use client";

import { LayoutPresets } from "@/preferences/enums";

import AddColumnIcon from "./assets/icons/add_column_right.svg";
import FitIcon from "./assets/icons/fit_width.svg";
import FitPageWidthIcon from "./assets/icons/fit_page_width.svg";
import NewspaperIcon from "./assets/icons/newspaper.svg";
import RangeIcon from "./assets/icons/arrow_range.svg";
import TuneIcon from "./assets/icons/tune.svg";

import { 
  StatefulRadioGroup,
  useI18n,
  useAppSelector
} from "@edrlab/thorium-web/epub";

import { PlaygroundLineLengths } from "./PlaygroundLineLengths";
import { useLineLengths } from "./hooks/useLineLengths";

export const PlaygroundLayoutPresetsGroup = () => {
  const layoutPreset = useAppSelector(state => state.custom.layoutPreset);

  const { updatePreset } = useLineLengths();

  const { t } = useI18n("playground");

  return(
    <>
    <StatefulRadioGroup 
      standalone={ true }
      label={ t("reader.layoutPresets.title") }
      orientation="horizontal"
      value={ layoutPreset }
      onChange={ async (val: string) => await updatePreset(val as LayoutPresets) }
      items={[
        {
          icon: RangeIcon,
          label: t("reader.layoutPresets.lineLength"),
          value: LayoutPresets.LINE_LENGTH
        },
        {
          icon: FitIcon,
          label: t("reader.layoutPresets.margin"),
          value: LayoutPresets.MARGIN
        },
        {
          icon: FitPageWidthIcon,
          label: t("reader.layoutPresets.fullWidth"),
          value: LayoutPresets.FULL_WIDTH
        },
        {
          icon: AddColumnIcon,
          label: t("reader.layoutPresets.columns"),
          value: LayoutPresets.COLUMNS
        },
        {
          icon: NewspaperIcon,
          label: t("reader.layoutPresets.newspaper"),
          value: LayoutPresets.NEWSPAPER
        },
        {
          icon: TuneIcon,
          label: t("reader.layoutPresets.custom"),
          value: LayoutPresets.CUSTOM
        }
      ]}
    />
    <PlaygroundLineLengths />
    </>
  )
}