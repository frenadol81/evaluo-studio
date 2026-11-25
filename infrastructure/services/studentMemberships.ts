import type { PhotoCrop } from '../../types';
import { matchStudentPhotos, photoGroupCodes, photoPlanetRound } from './studentPhotoImport';

type Profile = {
  id: string | number;
  groupId?: string;
  info: { name: string; groupId?: string; course?: string; photoUrl?: string; photoCrop?: PhotoCrop };
};

type Group = { id: string; name: string };

export function studentMemberships(profiles: Profile[], groups: Group[]) {
  const membership = profiles.map(profile => {
    const groupId = profile.info.groupId || profile.groupId || '';
    const group = groups.find(item => item.id === groupId)?.name || groupId;
    const round = photoPlanetRound(groupId) ?? photoPlanetRound(group);
    const source = round
      ? [profile.info.course || '', profile.info.name]
      : [group, groupId, profile.info.course || ''];
    const course = source.map(photoGroupCodes).find(codes => codes.length === 1)?.[0];
    return { profile, round, course };
  });
  const linked = new Map(profiles.map(profile => [String(profile.id), String(profile.id)]));
  for (const { profile, round, course } of membership) {
    if (!round || !course || profile.info.name.trim().split(/\s+/).length < 2) continue;
    const classroom = membership.filter(item => !item.round && item.course === course);
    const candidates = classroom.filter(item => item.profile.info.name.trim().includes(' ') &&
      matchStudentPhotos(profile.info.name, [item.profile.info.name], false, false, false).length > 0);
    if (candidates.length === 1) {
      linked.set(String(profile.id), String(candidates[0].profile.id));
    }
  }
  return linked;
}

export function withSharedStudentPhotos<T extends Profile>(profiles: T[], groups: Group[]): T[] {
  const linked = studentMemberships(profiles, groups);
  const sources = new Map<string, T>();
  for (const profile of profiles) {
    if (!profile.info.photoUrl) continue;
    const id = String(profile.id);
    const identity = linked.get(id) || id;
    if (!sources.has(identity) || identity === id) sources.set(identity, profile);
  }
  return profiles.map(profile => {
    const source = sources.get(linked.get(String(profile.id)) || '');
    if (!source || source === profile) return profile;
    return { ...profile, info: { ...profile.info, photoUrl: source.info.photoUrl, photoCrop: source.info.photoCrop } };
  });
}
