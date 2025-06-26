<template>
  <el-dialog
    v-model="visible"
    title="导入冲突处理"
    width="800px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <div class="conflict-dialog">
      <el-alert
        title="发现配置冲突"
        type="warning"
        :closable="false"
        show-icon
      >
        <template #default>
          <p>导入的配置中有 {{ conflicts.length }} 个项目与现有配置冲突，请选择处理方式：</p>
        </template>
      </el-alert>

      <div class="conflict-list">
        <el-table :data="conflicts" style="width: 100%" max-height="400">
          <el-table-column prop="type" label="类型" width="80">
            <template #default="{ row }">
              <el-tag :type="row.type === 'connection' ? 'primary' : 'success'">
                {{ row.type === 'connection' ? '连接' : '分组' }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="path" label="路径" min-width="200">
            <template #default="{ row }">
              <span class="conflict-path">{{ row.path }}</span>
            </template>
          </el-table-column>

          <el-table-column label="现有配置" min-width="150">
            <template #default="{ row }">
              <div class="config-info">
                <div><strong>{{ row.existing.name }}</strong></div>
                <div v-if="row.type === 'connection'" class="config-detail">
                  {{ row.existing.host }}:{{ row.existing.port }}
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="导入配置" min-width="150">
            <template #default="{ row }">
              <div class="config-info">
                <div><strong>{{ row.imported.name }}</strong></div>
                <div v-if="row.type === 'connection'" class="config-detail">
                  {{ row.imported.host }}:{{ row.imported.port }}
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="处理方式" width="150">
            <template #default="{ row }">
              <el-select v-model="row.action" size="small">
                <el-option label="跳过" value="skip" />
                <el-option label="替换" value="replace" />
                <el-option label="重命名" value="rename" />
              </el-select>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="batch-actions">
        <el-button size="small" @click="setBatchAction('skip')">
          全部跳过
        </el-button>
        <el-button size="small" @click="setBatchAction('replace')">
          全部替换
        </el-button>
        <el-button size="small" @click="setBatchAction('rename')">
          全部重命名
        </el-button>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleConfirm">
          确认处理
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { ConflictInfo } from "../types/connection";

interface Props {
  visible: boolean;
  conflicts: ConflictInfo[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "update:visible": [value: boolean];
  confirm: [conflicts: ConflictInfo[]];
  cancel: [];
}>();

const visible = computed({
  get: () => props.visible,
  set: (value) => emit("update:visible", value),
});

const setBatchAction = (action: 'skip' | 'replace' | 'rename') => {
  props.conflicts.forEach(conflict => {
    conflict.action = action;
  });
};

const handleConfirm = () => {
  emit("confirm", props.conflicts);
  visible.value = false;
};

const handleCancel = () => {
  emit("cancel");
  visible.value = false;
};
</script>

<style scoped lang="scss">
.conflict-dialog {
  .el-alert {
    margin-bottom: 20px;
  }

  .conflict-list {
    margin: 20px 0;
  }

  .conflict-path {
    color: #606266;
    font-family: monospace;
    font-size: 12px;
  }

  .config-info {
    .config-detail {
      color: #909399;
      font-size: 12px;
      margin-top: 4px;
    }
  }

  .batch-actions {
    margin-top: 16px;
    padding: 16px;
    background: #f5f7fa;
    border-radius: 4px;
    text-align: center;

    .el-button {
      margin: 0 8px;
    }
  }
}

.dialog-footer {
  text-align: right;
}
</style>
