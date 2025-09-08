"use client";

import { 
  StatefulSettingsItemProps,
  StatefulNumberField,
  useEpubNavigator,
  usePreferences,
  useI18n,
  useAppSelector,
} from "@edrlab/thorium-web/epub";
import { LAYOUT_CONSTANTS } from "@/lib/constants/uiConstants";
import { PlaygroundMaxChars } from "./PlaygroundMaxChars";
import { PlaygroundMinChars } from "./PlaygroundMinChars";
import { useLineLengths } from "./hooks/useLineLengths";

export const PlaygroundLineLengths = ({ standalone = true }: StatefulSettingsItemProps) => {
  const RSPrefs = usePreferences();
  const lineLength = useAppSelector(state => state.settings.lineLength);
  const { preferencesEditor } = useEpubNavigator();
  const { updatePreference } = useLineLengths();
  const { t } = useI18n("playground");

  const lineLengthRangeConfig = {
    range: preferencesEditor?.optimalLineLength.supportedRange || [LAYOUT_CONSTANTS.LINE_LENGTH_RANGE.MIN, LAYOUT_CONSTANTS.LINE_LENGTH_RANGE.MAX],
    step: preferencesEditor?.optimalLineLength.step || LAYOUT_CONSTANTS.LINE_LENGTH_RANGE.DEFAULT_STEP
  };

  const optimalLineLength = lineLength?.optimal || RSPrefs.typography.optimalLineLength;
  const minLineLength = lineLength?.min?.chars || RSPrefs.typography.minimalLineLength || lineLengthRangeConfig.range[0];
  const maxLineLength = lineLength?.max?.chars || RSPrefs.typography.maximalLineLength || lineLengthRangeConfig.range[1];

  return(
    <>
    <StatefulNumberField
      standalone={ standalone }
      label={ t("reader.layoutPresets.minimalLineLength.title") }
      value={ minLineLength } 
      onChange={async (value: number) => await updatePreference("min", value)} 
      steppers={{
        decrementLabel: t("reader.layoutPresets.minimalLineLength.decrease"),
        incrementLabel: t("reader.layoutPresets.minimalLineLength.increase")
      }}
      range={ [lineLengthRangeConfig.range[0], optimalLineLength] }
      step={ lineLengthRangeConfig.step }
    /> 
    <PlaygroundMinChars />

    <StatefulNumberField
      standalone={ standalone }
      label={ t("reader.layoutPresets.optimalLineLength.title") }
      value={ optimalLineLength } 
      onChange={async (value: number) => await updatePreference("optimal", value)} 
      steppers={{
        decrementLabel: t("reader.layoutPresets.optimalLineLength.decrease"),
        incrementLabel: t("reader.layoutPresets.optimalLineLength.increase")
      }}
      range={ lineLengthRangeConfig.range }
      step={ lineLengthRangeConfig.step }
    /> 
    
    <StatefulNumberField
      standalone={ standalone }
      label={ t("reader.layoutPresets.maximalLineLength.title") }
      value={ maxLineLength } 
      onChange={async (value: number) => await updatePreference("max", value)}
      steppers={{
        decrementLabel: t("reader.layoutPresets.maximalLineLength.decrease"),
        incrementLabel: t("reader.layoutPresets.maximalLineLength.increase")
      }}
      range={ [optimalLineLength, lineLengthRangeConfig.range[1]] }
      step={ lineLengthRangeConfig.step }
    /> 
    <PlaygroundMaxChars />
    </>
  )
}