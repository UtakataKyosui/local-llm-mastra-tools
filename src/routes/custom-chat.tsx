import { createFileRoute } from '@tanstack/react-router';
import { AgentChat } from '#/components/AgentChat';

export const Route = createFileRoute('/custom-chat')({
  component: () => <AgentChat scope="custom" />,
});
