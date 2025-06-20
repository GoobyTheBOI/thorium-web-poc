import { StatefulReader, StatefulReaderProps } from "@edrlab/thorium-web/epub";
import { ThStoreProvider, ThPreferencesProvider } from "@edrlab/thorium-web/epub";
import { TtsPlugin } from "@/app/Plugins";
import { TtsPreference } from "@/app/Epub/preference";


export const MyCustomReader = ({
    rawManifest,
    selfHref
  }: Omit<StatefulReaderProps, "plugins"> ) => {

    return (
      <>
        <ThStoreProvider>
          <ThPreferencesProvider value={ TtsPreference }>
            <StatefulReader
              rawManifest={ rawManifest }
              selfHref={ selfHref }
              plugins={ TtsPlugin }
            />
          </ThPreferencesProvider>
        </ThStoreProvider>
      </>
    )
  }
