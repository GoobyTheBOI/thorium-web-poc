"use client";

import { PlaygroundActionsKeys } from "@/preferences/preferences";
import { ThPlugin, createDefaultPlugin, StatefulReader, StatefulReaderProps } from "@edrlab/thorium-web/epub";
import { PlaygroundLayoutPresetsTrigger } from "./Actions/LayoutPresets/PlaygroundLayoutPresetsTrigger";
import { PlaygroundLayoutPresetsContainer } from "./Actions/LayoutPresets/PlaygroundLayoutPresetsContainer";
import { ActivateTtsTrigger, ActivateTtsContainer } from "@/app/epub/actions/tts";
import { TtsActionKeys } from "@/app/epub/keys/TtsKeys";

export const CustomReader = ({
  rawManifest,
  selfHref
}: Omit<StatefulReaderProps, "plugins"> ) => {
    const defaultPlugin: ThPlugin = createDefaultPlugin();
    const customPlugins: ThPlugin[] = [ defaultPlugin, {
      id: "custom",
      name: "Custom Components",
      description: "Custom components for Readium Playground StatefulReader",
      version: "1.0.0",
      components: {
        actions: {
          [PlaygroundActionsKeys.layoutPresets]: {
            Trigger: PlaygroundLayoutPresetsTrigger,
            Target: PlaygroundLayoutPresetsContainer
          }
        }
      }
    },
    {
      id: "tts-plugin",
      name: "Text-to-Speech Plugin",
      description: "Text-to-Speech functionality for the Reader",
      version: "0.10.0",
      components: {
        actions: {
          [TtsActionKeys.activateTts]: {
            Trigger: ActivateTtsTrigger,
            Target: ActivateTtsContainer
          }
        }
      }
    },
  ];

  return (
    <StatefulReader
      rawManifest={rawManifest}
      selfHref={selfHref}
      plugins={customPlugins}
    />
  );
};
