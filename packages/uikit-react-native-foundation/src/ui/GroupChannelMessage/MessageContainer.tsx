import React from 'react';
import { Pressable } from 'react-native';

import type { SendbirdMessage } from '@sendbird/uikit-utils';
import { getMessageTimeFormat } from '@sendbird/uikit-utils';

import Box from '../../components/Box';
import Text from '../../components/Text';
import createStyleSheet from '../../styles/createStyleSheet';
import useUIKitTheme from '../../theme/useUIKitTheme';
import Avatar from '../Avatar';
import type { GroupChannelMessageProps } from './index';

type Props = GroupChannelMessageProps<SendbirdMessage>;

const MessageContainer = (props: Props) => {
  if (props.variant === 'incoming') {
    return <MessageContainer.Incoming {...props} />;
  } else {
    return <MessageContainer.Outgoing {...props} />;
  }
};

MessageContainer.Incoming = function MessageContainerIncoming({
  children,
  groupedWithNext,
  groupedWithPrev,
  message,
  onPressAvatar,
  strings,
}: Props) {
  const { colors } = useUIKitTheme();
  const color = colors.ui.groupChannelMessage.incoming;

  return (
    <Box flexDirection={'row'} justifyContent={'flex-start'} alignItems={'flex-end'}>
      <Box width={26} marginRight={12}>
        {(message.isFileMessage() || message.isUserMessage()) && !groupedWithNext && (
          <Pressable onPress={onPressAvatar}>
            <Avatar size={26} uri={message.sender?.profileUrl} />
          </Pressable>
        )}
      </Box>
      <Box flexShrink={1}>
        {!groupedWithPrev && (
          <Box marginLeft={12} marginBottom={4}>
            {(message.isFileMessage() || message.isUserMessage()) && (
              <Text caption1 color={color.enabled.textSenderName} numberOfLines={1}>
                {strings?.senderName ?? message.sender.nickname}
              </Text>
            )}
          </Box>
        )}

        <Box flexDirection={'row'} alignItems={'flex-end'}>
          <Box style={styles.bubble}>{children}</Box>
          {!groupedWithNext && (
            <Box marginLeft={4}>
              <Text caption4 color={color.enabled.textTime}>
                {strings?.sentDate ?? getMessageTimeFormat(new Date(message.createdAt))}
              </Text>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

MessageContainer.Outgoing = function MessageContainerOutgoing({
  children,
  message,
  groupedWithNext,
  strings,
  sendingStatus,
}: Props) {
  const { colors } = useUIKitTheme();
  const color = colors.ui.groupChannelMessage.outgoing;

  return (
    <Box flexDirection={'row'} justifyContent={'flex-end'} alignItems={'flex-end'}>
      <Box flexDirection={'row'} alignItems={'flex-end'} justifyContent={'center'}>
        {sendingStatus && <Box marginRight={4}>{sendingStatus}</Box>}

        {!groupedWithNext && (
          <Box marginRight={4}>
            <Text caption4 color={color.enabled.textTime}>
              {strings?.sentDate ?? getMessageTimeFormat(new Date(message.createdAt))}
            </Text>
          </Box>
        )}
      </Box>
      <Box style={styles.bubble}>{children}</Box>
    </Box>
  );
};

const styles = createStyleSheet({
  bubble: {
    maxWidth: 240,
    overflow: 'hidden',
    flexShrink: 1,
  },
});

export default MessageContainer;
