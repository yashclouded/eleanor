export function Avatar({ name, photo, large = false }: { name: string; photo?: string | null; large?: boolean }) {
  return <span className={`profile-avatar${large ? ' profile-avatar-large' : ''}`} aria-hidden="true">
    {photo?.startsWith('data:image/jpeg;base64,')
      ? <img src={photo} alt="" width={large ? 80 : 32} height={large ? 80 : 32} />
      : name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
  </span>
}
