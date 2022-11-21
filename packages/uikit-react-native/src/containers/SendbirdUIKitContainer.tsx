import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import Sendbird from '@sendbird/chat';
import { GroupChannelModule } from '@sendbird/chat/groupChannel';
import { OpenChannelModule } from '@sendbird/chat/openChannel';
import type { HeaderStyleContextType, UIKitTheme } from '@sendbird/uikit-react-native-foundation';
import {
  DialogProvider,
  Header,
  HeaderStyleProvider,
  LightUIKitTheme,
  ToastProvider,
  UIKitThemeProvider,
} from '@sendbird/uikit-react-native-foundation';
import type {
  SendbirdBaseChannel,
  SendbirdChatSDK,
  SendbirdGroupChannelCreateParams,
  SendbirdMember,
  SendbirdUser,
} from '@sendbird/uikit-utils';
import { useIsFirstMount } from '@sendbird/uikit-utils';

import { LocalizationContext, LocalizationProvider } from '../contexts/LocalizationCtx';
import { PlatformServiceProvider } from '../contexts/PlatformServiceCtx';
import type { UIKitFeaturesInSendbirdChatContext } from '../contexts/SendbirdChatCtx';
import { SendbirdChatProvider } from '../contexts/SendbirdChatCtx';
import { UserProfileProvider } from '../contexts/UserProfileCtx';
import EmojiManager from '../libs/EmojiManager';
import InternalLocalCacheStorage from '../libs/InternalLocalCacheStorage';
import StringSetEn from '../localization/StringSet.en';
import type { StringSet } from '../localization/StringSet.type';
import SBUDynamicModule from '../platform/dynamicModule';
import type {
  ClipboardServiceInterface,
  FileServiceInterface,
  MediaServiceInterface,
  NotificationServiceInterface,
} from '../platform/types';
import type { ErrorBoundaryProps, LocalCacheStorage } from '../types';
import VERSION from '../version';
import InternalErrorBoundaryContainer from './InternalErrorBoundaryContainer';

const NetInfo = SBUDynamicModule.get('@react-native-community/netinfo', 'warn');

export const SendbirdUIKit = Object.freeze({
  VERSION,
  PLATFORM: Platform.OS.toLowerCase(),
});

export type SendbirdUIKitContainerProps = React.PropsWithChildren<{
  appId: string;
  platformServices: {
    file: FileServiceInterface;
    notification: NotificationServiceInterface;
    clipboard: ClipboardServiceInterface;
    media?: MediaServiceInterface;
  };
  chatOptions?: {
    localCacheStorage?: LocalCacheStorage;
    onInitialized?: (sdkInstance: SendbirdChatSDK) => SendbirdChatSDK;
  } & Partial<UIKitFeaturesInSendbirdChatContext>;
  localization?: {
    stringSet?: StringSet;
  };
  styles?: {
    theme?: UIKitTheme;
    statusBarTranslucent?: boolean;
    defaultHeaderTitleAlign?: 'left' | 'center';
    defaultHeaderHeight?: number;
    HeaderComponent?: HeaderStyleContextType['HeaderComponent'];
  };
  toast?: {
    dismissTimeout?: number;
  };
  userProfile?: {
    onCreateChannel: (channel: SendbirdBaseChannel) => void;
    onBeforeCreateChannel?: (
      channelParams: SendbirdGroupChannelCreateParams,
      users: SendbirdUser[] | SendbirdMember[],
    ) => SendbirdGroupChannelCreateParams | Promise<SendbirdGroupChannelCreateParams>;
  };
  errorBoundary?: {
    onError?: (props: ErrorBoundaryProps) => void;
    ErrorInfoComponent?: (props: ErrorBoundaryProps) => JSX.Element;
  };
}>;

const SendbirdUIKitContainer = ({
  children,
  appId,
  chatOptions,
  platformServices,
  localization,
  styles,
  toast,
  userProfile,
  errorBoundary,
}: SendbirdUIKitContainerProps) => {
  const defaultStringSet = localization?.stringSet ?? StringSetEn;

  const isFirstMount = useIsFirstMount();
  const unsubscribes = useRef<Array<() => void>>([]);
  const internalStorage = useMemo(
    () => (chatOptions?.localCacheStorage ? new InternalLocalCacheStorage(chatOptions.localCacheStorage) : undefined),
    [chatOptions?.localCacheStorage],
  );

  const [sdkInstance, setSdkInstance] = useState<SendbirdChatSDK>(() => {
    const sendbird = initializeSendbird(appId, internalStorage, chatOptions?.onInitialized);
    unsubscribes.current = sendbird.unsubscribes;
    return sendbird.chatSDK;
  });
  const emojiManager = useMemo(() => new EmojiManager(internalStorage), [internalStorage]);

  useLayoutEffect(() => {
    if (!isFirstMount) {
      const sendbird = initializeSendbird(appId, internalStorage, chatOptions?.onInitialized);
      setSdkInstance(sendbird.chatSDK);
      unsubscribes.current = sendbird.unsubscribes;
    }

    return () => {
      if (!isFirstMount) {
        unsubscribes.current.forEach((u) => {
          try {
            u();
          } catch {}
        });
      }
    };
  }, [appId, internalStorage]);

  return (
    <SafeAreaProvider>
      <SendbirdChatProvider
        sdkInstance={sdkInstance}
        emojiManager={emojiManager}
        enableAutoPushTokenRegistration={chatOptions?.enableAutoPushTokenRegistration ?? true}
        enableChannelListTypingIndicator={chatOptions?.enableChannelListTypingIndicator ?? false}
        enableChannelListMessageReceiptStatus={chatOptions?.enableChannelListMessageReceiptStatus ?? false}
        enableUseUserIdForNickname={chatOptions?.enableUseUserIdForNickname ?? false}
      >
        <LocalizationProvider stringSet={defaultStringSet}>
          <PlatformServiceProvider
            fileService={platformServices.file}
            notificationService={platformServices.notification}
            clipboardService={platformServices.clipboard}
            mediaService={platformServices.media}
          >
            <UIKitThemeProvider theme={styles?.theme ?? LightUIKitTheme}>
              <HeaderStyleProvider
                HeaderComponent={styles?.HeaderComponent ?? Header}
                defaultTitleAlign={styles?.defaultHeaderTitleAlign ?? 'left'}
                statusBarTranslucent={styles?.statusBarTranslucent ?? true}
              >
                <LocalizationContext.Consumer>
                  {(value) => {
                    const STRINGS = value?.STRINGS || defaultStringSet;
                    return (
                      <DialogProvider
                        defaultLabels={{
                          alert: { ok: STRINGS.DIALOG.ALERT_DEFAULT_OK },
                          prompt: {
                            ok: STRINGS.DIALOG.PROMPT_DEFAULT_OK,
                            cancel: STRINGS.DIALOG.PROMPT_DEFAULT_CANCEL,
                            placeholder: STRINGS.DIALOG.PROMPT_DEFAULT_PLACEHOLDER,
                          },
                        }}
                      >
                        <ToastProvider dismissTimeout={toast?.dismissTimeout}>
                          <UserProfileProvider
                            onCreateChannel={userProfile?.onCreateChannel}
                            onBeforeCreateChannel={userProfile?.onBeforeCreateChannel}
                          >
                            <InternalErrorBoundaryContainer {...errorBoundary}>
                              {children}
                            </InternalErrorBoundaryContainer>
                          </UserProfileProvider>
                        </ToastProvider>
                      </DialogProvider>
                    );
                  }}
                </LocalizationContext.Consumer>
              </HeaderStyleProvider>
            </UIKitThemeProvider>
          </PlatformServiceProvider>
        </LocalizationProvider>
      </SendbirdChatProvider>
    </SafeAreaProvider>
  );
};

const initializeSendbird = (
  appId: string,
  internalStorage?: InternalLocalCacheStorage,
  onInitialized?: (sdk: SendbirdChatSDK) => SendbirdChatSDK,
) => {
  const unsubscribes: Array<() => void> = [];
  let chatSDK: SendbirdChatSDK;

  chatSDK = Sendbird.init({
    appId,
    modules: [new GroupChannelModule(), new OpenChannelModule()],
    localCacheEnabled: Boolean(internalStorage),
    useAsyncStorageStore: internalStorage as never,
    newInstance: true,
  });

  if (onInitialized) {
    chatSDK = onInitialized(chatSDK);
  }

  if (SendbirdUIKit.VERSION) {
    chatSDK.addExtension('sb_uikit', SendbirdUIKit.VERSION);
  }

  if (SendbirdUIKit.PLATFORM) {
    chatSDK.addExtension('device-os-platform', SendbirdUIKit.PLATFORM);
  }

  if (NetInfo?.addEventListener) {
    const listener = (callback: () => void, callbackType: 'online' | 'offline') => {
      const unsubscribe = NetInfo.addEventListener((state) => {
        const online = Boolean(state.isConnected) || Boolean(state.isInternetReachable);
        if (online && callbackType === 'online') callback();
        if (!online && callbackType === 'offline') callback();
      });
      unsubscribes.push(unsubscribe);
      return unsubscribe;
    };
    chatSDK.setOnlineListener?.((onOnline) => listener(onOnline, 'online'));
    chatSDK.setOfflineListener?.((onOffline) => listener(onOffline, 'offline'));
  }
  return { chatSDK, unsubscribes };
};

export default SendbirdUIKitContainer;
