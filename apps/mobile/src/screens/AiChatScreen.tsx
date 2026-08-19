import React from 'react'
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import { chat } from '../lib/api'
import { colors } from '../theme'
import Button from '../components/Button'

interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
}

export default function AiChatScreen({ route }: { route: { params: { tenantSlug: string } } }) {
  const { tenantSlug } = route.params
  const [messages, setMessages] = React.useState<Message[]>([
    { id: 'welcome', role: 'assistant', text: 'Hello! I can help you book appointments, check your bookings, or answer questions. What would you like to do?' },
  ])
  const [input, setInput] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [conversationId, setConversationId] = React.useState<string | undefined>(undefined)

  const scrollRef = React.useRef<ScrollView>(null)

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setSending(true)
    try {
      const result = await chat(tenantSlug, text, conversationId)
      if (result.conversationId) setConversationId(result.conversationId)
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: 'assistant', text: result.reply || '...' }])
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Could not reach the assistant. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((m) => (
            <View key={m.id} style={[styles.bubbleWrap, m.role === 'user' ? styles.userWrap : styles.assistantWrap]}>
              <View style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
                <Text style={[styles.bubbleText, m.role === 'user' && styles.userText]}>{m.text}</Text>
              </View>
            </View>
          ))}
          {sending ? (
            <View style={styles.typingWrap}>
              <Text style={styles.typing}>Assistant is typing…</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            multiline
            returnKeyType="send"
            onSubmitEditing={send}
          />
          <Pressable onPress={send} disabled={sending || !input.trim()} style={[styles.sendBtn, (sending || !input.trim()) && styles.sendBtnDisabled]}>
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  messages: {
    padding: 16,
    paddingBottom: 24,
  },
  bubbleWrap: {
    marginBottom: 10,
    flexDirection: 'row',
  },
  userWrap: {
    justifyContent: 'flex-end',
  },
  assistantWrap: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: colors.accent,
  },
  assistantBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 21,
  },
  userText: {
    color: '#fff',
  },
  typingWrap: {
    alignItems: 'flex-start',
  },
  typing: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 24,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  },
  sendBtn: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
})