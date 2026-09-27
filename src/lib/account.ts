import { isPlatformLoginId } from "./access";
import { hashPassword } from "./auth";
import { prisma } from "./prisma";

/// 손님 가입과 셀러 신청(로그인 안 한 상태)이 같이 쓰는 계정 만들기.
export type NewAccount = {
  loginId: string;
  password: string;
  name: string;
  phone: string;
  zipcode?: string | null;
  address?: string | null;
  addressDetail?: string | null;
};

/// 문제가 있으면 { error, field }, 없으면 null. 오류 문장은 고치는 방법까지 담는다.
export async function newAccountProblem(
  input: NewAccount
): Promise<{ error: string; field: string } | null> {
  if (!input.loginId) {
    return { error: "아이디를 적어주세요. 로그인할 때 쓸 이름이에요.", field: "loginId" };
  }
  if (!input.password) {
    return { error: "비밀번호를 적어주세요.", field: "password" };
  }
  if (input.password.length < 6) {
    return {
      error: `비밀번호가 너무 짧아요. 6자 이상으로 만들어주세요. (지금 ${input.password.length}자)`,
      field: "password",
    };
  }
  if (!input.name) {
    return { error: "이름을 적어주세요.", field: "name" };
  }
  if (!input.phone) {
    return { error: "연락처를 적어주세요. 예: 010-1234-5678", field: "phone" };
  }
  // 운영자용으로 예약된 아이디는 이유를 알려주지 않고 막는다
  if (isPlatformLoginId(input.loginId)) {
    return {
      error: "이 아이디는 쓸 수 없어요. 다른 아이디를 골라주세요.",
      field: "loginId",
    };
  }
  const exists = await prisma.user.findUnique({ where: { loginId: input.loginId } });
  if (exists) {
    return {
      error:
        "이미 다른 분이 쓰는 아이디예요. 뒤에 숫자를 붙이는 등 다른 아이디로 바꿔주세요. 예전에 가입하셨다면 로그인해주세요.",
      field: "loginId",
    };
  }
  return null;
}

/// 가입만으로는 누구도 셀러나 운영자가 될 수 없다 — 항상 손님으로 만든다.
export function createCustomerAccount(input: NewAccount) {
  return prisma.user.create({
    data: {
      loginId: input.loginId,
      password: hashPassword(input.password),
      name: input.name,
      phone: input.phone,
      zipcode: input.zipcode ?? null,
      address: input.address ?? null,
      addressDetail: input.addressDetail ?? null,
      role: "CUSTOMER",
    },
  });
}
