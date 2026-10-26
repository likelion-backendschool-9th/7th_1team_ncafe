import styles from "./member.module.css";
import type { Member } from "@/lib/memberApi";
export function profileFromForm(form: FormData) {
  return Object.fromEntries(["nickname", "birth", "gender", "phoneNumber", "email", "postcode", "address1", "address2"].map(key => [key, key === "birth" ? form.get(key) || null : form.get(key)]));
}
export default function MemberFields({ member }: { member?: Member }) {
  return <>
    <label className={styles.field}>닉네임 *<input name="nickname" required maxLength={255} defaultValue={member?.nickname} autoComplete="nickname" /></label>
    <label className={styles.field}>생년월일<input name="birth" type="date" defaultValue={member?.birth ?? ""} autoComplete="bday" /></label>
    <label className={styles.field}>성별<select name="gender" defaultValue={member?.gender ?? ""}><option value="">선택 안 함</option><option value="M">남성</option><option value="F">여성</option></select></label>
    <label className={styles.field}>전화번호<input name="phoneNumber" type="tel" maxLength={20} defaultValue={member?.phoneNumber ?? ""} autoComplete="tel" /></label>
    <label className={styles.field}>이메일<input name="email" type="email" maxLength={255} defaultValue={member?.email ?? ""} autoComplete="email" /></label>
    <label className={styles.field}>우편번호<input name="postcode" maxLength={255} defaultValue={member?.postcode ?? ""} autoComplete="postal-code" /></label>
    <label className={styles.field}>주소<input name="address1" maxLength={255} defaultValue={member?.address1 ?? ""} autoComplete="address-line1" /></label>
    <label className={styles.field}>상세주소<input name="address2" maxLength={255} defaultValue={member?.address2 ?? ""} autoComplete="address-line2" /></label>
  </>;
}
