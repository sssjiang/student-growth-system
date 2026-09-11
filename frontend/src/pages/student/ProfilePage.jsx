import { useEffect, useState } from 'react';
import { Check, Pencil, Plus, Sparkles, X } from 'lucide-react';
import { StudentAPI } from '@/api';
import { Empty, Field, PageTitle } from '@/components';
import { useToast } from '@/contexts/ToastContext';

function ProfilePage() {
  const { notify } = useToast();
  const [form, setForm] = useState(null);
  const [savedProfile, setSavedProfile] = useState(null);
  const [newTag, setNewTag] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    StudentAPI.getProfile().then((data) => {
      const profile = { ...data.student, tags: [...data.student.tags] };
      setForm(profile);
      setSavedProfile(profile);
    });
  }, []);
  if (!form) return <Empty>正在加载个人档案…</Empty>;
  const update = (event) =>
    setForm({ ...form, [event.target.name]: event.target.value });
  const addTag = () => {
    const tag = newTag.trim();
    if (tag && !form.tags.includes(tag))
      setForm({ ...form, tags: [...form.tags, tag] });
    setNewTag('');
  };
  const save = async () => {
    setSaving(true);
    try {
      const data = await StudentAPI.updateProfile(form);
      const profile = { ...data.student, tags: [...data.student.tags] };
      setForm(profile);
      setSavedProfile(profile);
      setEditing(false);
      setNewTag('');
      notify('个人档案已保存');
    } catch (err) {
      notify(err.message);
    } finally {
      setSaving(false);
    }
  };
  const cancelEditing = () => {
    setForm({ ...savedProfile, tags: [...savedProfile.tags] });
    setNewTag('');
    setEditing(false);
  };
  return (
    <>
      <PageTitle
        eyebrow="我的档案"
        title="让老师更了解真实的你"
        description="完善兴趣与特长，合适的校园活动就更容易找到你。"
        action={
          <div className="profile-actions">
            {editing ? (
              <>
                <button className="secondary" onClick={cancelEditing}>
                  <X size={17} />
                  取消
                </button>
                <button className="primary" onClick={save} disabled={saving}>
                  <Check size={17} />
                  {saving ? '正在保存…' : '保存修改'}
                </button>
              </>
            ) : (
              <button className="primary" onClick={() => setEditing(true)}>
                <Pencil size={17} />
                编辑档案
              </button>
            )}
          </div>
        }
      />
      <div className="profile-grid">
        <section className="card">
          <h3>基本信息</h3>
          <div className="form-grid">
            <Field label="姓名">
              <input
                name="name"
                value={form.name}
                onChange={update}
                disabled={!editing}
              />
            </Field>
            <Field label="学号">
              <input value={form.student_no} disabled />
            </Field>
            <Field label="性别">
              <select
                name="gender"
                value={form.gender}
                onChange={update}
                disabled={!editing}
              >
                <option value="">请选择</option>
                <option>男</option>
                <option>女</option>
              </select>
            </Field>
            <Field label="年级">
              <input
                name="grade"
                value={form.grade}
                onChange={update}
                disabled={!editing}
              />
            </Field>
            <Field label="班级">
              <input
                name="class_name"
                value={form.class_name}
                onChange={update}
                disabled={!editing}
              />
            </Field>
            <Field label="生日">
              <input
                name="birthday"
                type="date"
                value={form.birthday}
                onChange={update}
                disabled={!editing}
              />
            </Field>
            <Field label="邮箱">
              <input
                name="email"
                value={form.email}
                onChange={update}
                disabled={!editing}
              />
            </Field>
            <Field label="联系电话">
              <input
                name="phone"
                value={form.phone}
                onChange={update}
                disabled={!editing}
              />
            </Field>
          </div>
        </section>
        <section className="card interests-card">
          <div className="section-icon">
            <Sparkles />
          </div>
          <h3>兴趣与特长</h3>
          <p>添加能代表你的标签，也可以详细描述经历。</p>
          <div className="editable-tags">
            {form.tags.map((tag) => (
              <span key={tag}>
                {tag}
                {editing && (
                  <button
                    onClick={() =>
                      setForm({
                        ...form,
                        tags: form.tags.filter((item) => item !== tag),
                      })
                    }
                    aria-label={`删除兴趣标签 ${tag}`}
                  >
                    <X />
                  </button>
                )}
              </span>
            ))}
          </div>
          {editing && (
            <div className="tag-input">
              <input
                value={newTag}
                onChange={(event) => setNewTag(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addTag();
                  }
                }}
                placeholder="输入兴趣标签"
              />
              <button onClick={addTag} aria-label="添加兴趣标签">
                <Plus />
              </button>
            </div>
          )}
          <Field label="关于我的兴趣">
            <textarea
              name="interest_description"
              value={form.interest_description}
              onChange={update}
              disabled={!editing}
              placeholder="例如：我加入校篮球队两年，擅长组织团队训练…"
            />
          </Field>
        </section>
        <section className="card full">
          <h3>个人介绍</h3>
          <Field label="想让老师了解的其他信息">
            <textarea
              name="bio"
              value={form.bio}
              onChange={update}
              disabled={!editing}
            />
          </Field>
        </section>
      </div>
    </>
  );
}

export default ProfilePage;
