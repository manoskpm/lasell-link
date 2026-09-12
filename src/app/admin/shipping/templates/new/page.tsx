import { NewTemplateForm } from "./NewTemplateForm";

export default function NewTemplatePage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">택배사 양식 등록</h1>
        <p className="mt-1 text-sm text-zinc-500">
          택배사에서 받은 대량접수 엑셀 파일을 그대로 올려주세요. 파일을 읽어서
          어느 칸이 받는분·연락처·주소인지 자동으로 찾아드려요.
        </p>
      </div>
      <NewTemplateForm />
    </div>
  );
}
