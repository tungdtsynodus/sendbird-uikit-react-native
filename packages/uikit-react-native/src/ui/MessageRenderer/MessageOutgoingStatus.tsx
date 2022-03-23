import React, { useState } from 'react';
import type Sendbird from 'sendbird';

import { useChannelHandler } from '@sendbird/chat-react-hooks';
import { useSendbirdChat } from '@sendbird/uikit-react-native-core';
import { Icon, LoadingSpinner, createStyleSheet, useUIKitTheme } from '@sendbird/uikit-react-native-foundation';

const SIZE = 16;

type Props = {
  message: Sendbird.FileMessage | Sendbird.UserMessage;
};
const MessageOutgoingStatus: React.FC<Props> = ({ message }) => {
  const { sdk } = useSendbirdChat();
  const { colors } = useUIKitTheme();

  const [state, setState] = useState({ unreadCount: 0, undeliveredCount: 0 });

  useChannelHandler(
    sdk,
    `MessageOutgoingStatus_${message.reqId}`,
    {
      onReadReceiptUpdated(channel) {
        if (channel.url === message.channelUrl) {
          setState({
            unreadCount: channel.getUnreadMemberCount(message),
            undeliveredCount: channel.getUndeliveredMemberCount(message),
          });
        }
      },
    },
    [message.reqId],
  );

  if (message.sendingStatus === 'pending') {
    return <LoadingSpinner size={SIZE} style={styles.container} />;
  }

  if (message.sendingStatus === 'failed') {
    return <Icon icon={'error'} size={SIZE} color={colors.secondary} style={styles.container} />;
  }

  if (state.unreadCount === 0) {
    return <Icon icon={'done-all'} size={SIZE} color={colors.secondary} style={styles.container} />;
  }

  if (state.undeliveredCount > 0) {
    return <Icon icon={'done'} size={SIZE} color={colors.onBackground03} style={styles.container} />;
  }

  if (state.unreadCount > 0) {
    return <Icon icon={'done-all'} size={SIZE} color={colors.onBackground03} style={styles.container} />;
  }

  return <Icon icon={'done-all'} size={SIZE} color={colors.secondary} style={styles.container} />;
};

const styles = createStyleSheet({
  container: {
    marginRight: 4,
  },
});

export default MessageOutgoingStatus;
