import { useEffect, useState } from 'react';
import { Check, Plus, Sparkles, X } from 'lucide-react';
import { StudentAPI } from '@/api';
import { Empty, Field, PageTitle } from '@/components';
import { useToast } from '@/contexts/ToastContext';

function ProfilePage() {
  const { notify } = useToast();
  const [form, setForm] = useState(null);
  const [newTag, setNewTag] = useState('');
  useEffect(() => {
    StudentAPI.getProfile().then((data) => setForm(data.student));
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
    try {
      const data = await StudentAPI.updateProfile(form);
      setForm(data.student);
      notify('个人档案已保存');
    } catch (err) {
      notify(err.message);
    }
  };
  return (
    <>
      <PageTitle
        eyebrow="我的档案"
        title="让老师更了解真实的你"
        description="完善兴趣与特长，合适的校园活动就更容易找到你。"
        action={
          <button className="primary" onClick={save}>
            <Check size={17} />
            保存修改
          </button>
        }
      />
      <div className="profile-grid">
        <section className="card">
          <h3>基本信息</h3>
          <div className="form-grid">
            <Field label="姓名">
              <input name="name" value={form.name} onChange={update} />
            </Field>
            <Field label="学号">
              <input value={form.student_no} disabled />
            </Field>
            <Field label="性别">
              <select name="gender" value={form.gender} onChange={update}>
                <option value="">请选择</option>
                <option>男</option>
                <option>女</option>
              </select>
            </Field>
            <Field label="年级">
              <input name="grade" value={form.grade} onChange={update} />
            </Field>
            <Field label="班级">
              <input
                name="class_name"
                value={form.class_name}
                onChange={update}
              />
            </Field>
            <Field label="生日">
              <input
                name="birthday"
                type="date"
                value={form.birthday}
                onChange={update}
              />
            </Field>
            <Field label="邮箱">
              <input name="email" value={form.email} onChange={update} />
            </Field>
            <Field label="联系电话">
              <input name="phone" value={form.phone} onChange={update} />
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
                <button
                  onClick={() =>
                    setForm({
                      ...form,
                      tags: form.tags.filter((item) => item !== tag),
                    })
                  }
                >
                  <X />
                </button>
              </span>
            ))}
          </div>
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
            <button onClick={addTag}>
              <Plus />
            </button>
          </div>
          <Field label="关于我的兴趣">
            <textarea
              name="interest_description"
              value={form.interest_description}
              onChange={update}
              placeholder="例如：我加入校篮球队两年，擅长组织团队训练…"
            />
          </Field>
        </section>
        <section className="card full">
          <h3>个人介绍</h3>
          <Field label="想让老师了解的其他信息">
            <textarea name="bio" value={form.bio} onChange={update} />
          </Field>
        </section>
      </div>
    </>
  );
}

export default ProfilePage;
