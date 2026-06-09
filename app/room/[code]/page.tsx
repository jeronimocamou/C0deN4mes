import LobbyClient from './LobbyClient'

export default async function LobbyPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  return <LobbyClient code={code.toUpperCase()} />
}
