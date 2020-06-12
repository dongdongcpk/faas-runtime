CREATE TABLE `sls_package` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `service` varchar(100) NOT NULL DEFAULT '' COMMENT '服务名',
  `version` varchar(20) NOT NULL DEFAULT '' COMMENT '版本',
  `pkg_url` varchar(1024) NOT NULL DEFAULT '' COMMENT '函数包下载 url',
  `shasum` varchar(64) NOT NULL DEFAULT '' COMMENT 'pkg 包 sha256',
  `status` varchar(20) NOT NULL DEFAULT '' COMMENT 'success、failure、packaging',
  `created_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT='sls 打包表';

INSERT INTO `sls_package` (`service`, `version`, `pkg_url`, `shasum`, `status`, `created_time`, `updated_time`)
VALUES
	('faas-demo-service', '1.0.0', 'http://s1.wacdn.com/client/mozi-faas-compile/faas-demo-service-1590657451916/pkg.tar.gz', '6d8670210106d61074c6d44cadd1e79619d41341bb2408c89a6cc8a88dfe5411', 'success', '2020-05-28 17:17:31', '2020-05-28 17:26:19');


CREATE TABLE `sls_runtime_status` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `service` varchar(100) NOT NULL DEFAULT '' COMMENT '服务名',
  `version` varchar(20) NOT NULL DEFAULT '' COMMENT '版本',
  `status` varchar(20) NOT NULL DEFAULT '' COMMENT 'online、offline、deploying',
  `created_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT='sls 运行时状态表';