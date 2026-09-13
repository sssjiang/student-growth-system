const ERROR_KEYS = {
  请先登录: 'signInRequired',
  '登录已过期，请重新登录': 'sessionExpired',
  无效的登录凭证: 'invalidToken',
  用户不存在: 'userMissing',
  没有访问此资源的权限: 'forbidden',
  '请填写用户名、密码、姓名和学号': 'registrationRequired',
  '密码至少需要 6 位': 'passwordLength',
  用户名或学号已存在: 'accountExists',
  用户名或密码错误: 'invalidCredentials',
  未找到学生资料: 'profileMissing',
  请选择文件: 'selectFile',
  凭证不存在: 'credentialMissing',
  只有被驳回的凭证可以重新提交: 'resubmitRejectedOnly',
  审核状态不正确: 'invalidReviewStatus',
  '请选择通过、驳回或撤销审核': 'selectReviewResult',
  驳回时请填写审核意见: 'rejectionCommentRequired',
  只有已审核的凭证可以撤销审核: 'reviewedOnlyUndo',
  '请描述活动需求，至少输入 2 个字': 'searchTooShort',
  学生不存在: 'studentMissing',
  '年份、学期或成绩格式不正确': 'invalidGrades',
  '请选择 CSV 文件': 'selectCsv',
  '请上传 UTF-8 编码的 CSV 文件': 'csvEncoding',
  至少需要两个学期的成绩才能生成趋势报告: 'insufficientGrades',
  文件不存在: 'fileMissing',
  没有访问此文件的权限: 'fileForbidden',
  '文件不能超过 10MB': 'fileTooLarge',
  '上传文件不能超过 40MB': 'knowledgeFileTooLarge',
  '教材文件不能超过 40MB': 'knowledgeFileTooLarge',
  'AI 辅助评审失败，请稍后重试': 'aiReviewFailed',
  请选择教材文件: 'selectKnowledgeFile',
  请填写教材名称: 'knowledgeTitleRequired',
  请选择正确的学科: 'invalidSubject',
  教材不存在: 'knowledgeMissing',
  辅导会话不存在: 'conversationMissing',
  会话学科不能修改: 'conversationSubjectLocked',
  请填写你的问题: 'questionRequired',
  '教材仅支持 PDF、DOCX、图片和 TXT 文件': 'knowledgeFileType',
  '请填写账号、姓名并选择账号角色': 'adminAccountRequired',
  用户名已存在: 'usernameExists',
  调试记录不存在: 'traceMissing',
};

export function errorMessage(error, t) {
  const key = ERROR_KEYS[error?.message];
  return key
    ? t(`apiErrors.${key}`)
    : error?.message || t('common.requestFailed');
}
