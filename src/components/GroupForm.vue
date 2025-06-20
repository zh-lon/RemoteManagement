<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    :title="isEdit ? '编辑分组' : '新建分组'"
    width="500px"
    :before-close="handleClose"
    destroy-on-close
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="80px"
      label-position="left"
    >
      <el-form-item label="分组名称" prop="name">
        <el-input
          v-model="formData.name"
          placeholder="请输入分组名称"
          maxlength="50"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="分组图标">
        <el-select
          v-model="formData.icon"
          placeholder="选择图标（可选）"
          clearable
        >
          <el-option
            v-for="icon in iconOptions"
            :key="icon.value"
            :label="icon.label"
            :value="icon.value"
          >
            <div class="icon-option">
              <el-icon><component :is="icon.component" /></el-icon>
              <span>{{ icon.label }}</span>
            </div>
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item label="描述">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="4"
          placeholder="请输入分组描述（可选）"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>

      <el-form-item v-if="!isEdit" label="父分组">
        <el-tree-select
          v-model="formData.parentId"
          :data="groupTreeData"
          :props="treeProps"
          placeholder="选择父分组（可选）"
          clearable
          check-strictly
          :render-after-expand="false"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ isEdit ? "保存" : "创建" }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from "vue";
import { ElMessage } from "element-plus";
import {
  Folder,
  FolderOpened,
  Collection,
  Box,
  Monitor,
  Connection,
  View,
  ChatLineSquare,
  Files,
  Document,
  Setting,
  Star,
  Flag,
  Location,
} from "@element-plus/icons-vue";
import { ConnectionGroup } from "@/types/connection";

// Props
interface Props {
  visible: boolean;
  group?: ConnectionGroup | null;
  groupTreeData: any[];
  parentGroup?: ConnectionGroup | null;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  group: null,
  groupTreeData: () => [],
  parentGroup: null,
});

// Emits
const emit = defineEmits<{
  "update:visible": [value: boolean];
  submit: [group: ConnectionGroup, parentId?: string];
}>();

// 响应式数据
const formRef = ref();
const submitting = ref(false);

// 计算属性
const isEdit = computed(() => !!props.group);

// 图标选项
const iconOptions = [
  { label: "文件夹", value: "Folder", component: Folder },
  { label: "打开文件夹", value: "FolderOpened", component: FolderOpened },
  { label: "集合", value: "Collection", component: Collection },
  { label: "盒子", value: "Box", component: Box },
  { label: "显示器", value: "Monitor", component: Monitor },
  { label: "连接", value: "Connection", component: Connection },
  { label: "视图", value: "View", component: View },
  { label: "聊天", value: "ChatLineSquare", component: ChatLineSquare },
  { label: "文件", value: "Files", component: Files },
  { label: "文档", value: "Document", component: Document },
  { label: "设置", value: "Setting", component: Setting },
  { label: "星标", value: "Star", component: Star },
  { label: "标记", value: "Flag", component: Flag },
  { label: "位置", value: "Location", component: Location },
];

// 表单数据
const formData = reactive({
  name: "",
  icon: "",
  description: "",
  parentId: "",
});

// 树形选择器配置
const treeProps = {
  children: "children",
  label: "name",
  value: "id",
};

// 表单验证规则
const rules = {
  name: [
    { required: true, message: "请输入分组名称", trigger: "blur" },
    { min: 1, max: 50, message: "分组名称长度在1到50个字符", trigger: "blur" },
  ],
};

// 监听器
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      initForm();
    }
  }
);

watch(
  () => props.group,
  (newVal) => {
    if (newVal && props.visible) {
      initForm();
    }
  }
);

// 方法
const initForm = () => {
  if (props.group) {
    // 编辑模式，填充现有数据
    Object.assign(formData, {
      name: props.group.name,
      icon: props.group.icon || "",
      description: props.group.description || "",
      parentId: "",
    });
  } else {
    // 新建模式，重置表单
    resetForm();

    // 如果有父分组，设置默认父分组
    if (props.parentGroup) {
      formData.parentId = props.parentGroup.id;
    }
  }
};

const resetForm = () => {
  Object.assign(formData, {
    name: "",
    icon: "",
    description: "",
    parentId: "",
  });
  formRef.value?.clearValidate();
};

const handleSubmit = async () => {
  try {
    await formRef.value.validate();
    submitting.value = true;

    const groupData: ConnectionGroup = {
      id: props.group?.id || "",
      name: formData.name,
      icon: formData.icon || undefined,
      description: formData.description || undefined,
      children: props.group?.children || [],
      createdAt: props.group?.createdAt || new Date(),
      updatedAt: new Date(),
      expanded: props.group?.expanded,
    };

    emit("submit", groupData, formData.parentId || undefined);

    ElMessage.success(isEdit.value ? "分组更新成功" : "分组创建成功");
    handleClose();
  } catch (error) {
    // 表单验证失败
  } finally {
    submitting.value = false;
  }
};

const handleClose = () => {
  emit("update:visible", false);
};
</script>

<style scoped lang="scss">
.icon-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}
</style>
