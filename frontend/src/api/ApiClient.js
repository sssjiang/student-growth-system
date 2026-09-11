import i18n from '@/locales/i18n';

const API_ROOT = import.meta.env.VITE_API_ROOT || '/api';
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
};

class ApiClient {
  async request(path, options = {}) {
    const token = localStorage.getItem('student_token');
    const isFormData = options.body instanceof FormData;
    const headers = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    };

    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${API_ROOT}${path}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 && token) {
        localStorage.removeItem('student_token');
        localStorage.removeItem('student_user');
      }
      const errorKey = ERROR_KEYS[data.error];
      throw new Error(
        errorKey
          ? i18n.t(`apiErrors.${errorKey}`)
          : data.error || i18n.t('common.requestFailed')
      );
    }

    return data;
  }

  async getBlob(path) {
    const token = localStorage.getItem('student_token');
    const response = await fetch(`${API_ROOT}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error(i18n.t('common.fileReadFailed'));
    return response.blob();
  }

  get(path) {
    return this.request(path);
  }

  post(path, body) {
    return this.request(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  put(path, body) {
    return this.request(path, { method: 'PUT', body: JSON.stringify(body) });
  }

  delete(path) {
    return this.request(path, { method: 'DELETE' });
  }
}

export default new ApiClient();
