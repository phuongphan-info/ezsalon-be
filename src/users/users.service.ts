import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Role } from '../roles/entities/role.entity';
import { User, USER_TABLE_NAME } from './entities/user.entity';
import { CacheService } from '../common/services/cache.service';
import { UpdateUserDto, CreateUserDto, UserQueryDto } from './dto/user.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class UsersService {
  private readonly protectedAdminEmails: string[];

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly cacheService: CacheService,
  ) {
    const adminEmails = process.env.PROTECTED_ADMIN_EMAILS || 'admin@ezsalon.com';
    this.protectedAdminEmails = adminEmails.split(',').map(email => email.trim());
  }

  private isProtectedAdminEmail(email: string): boolean {
    return this.protectedAdminEmails.includes(email);
  }

  private async clearUserCaches(): Promise<void> {
    await this.cacheService.clearRelatedCaches(USER_TABLE_NAME);
  }

  async create(createUserDto: CreateUserDto, createdByUserId?: string): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    let role: Role | null = null;
    if (createUserDto.role) {
      role = await this.roleRepository.findOne({
        where: { name: createUserDto.role },
      });

      if (!role) {
        throw new NotFoundException(`Role '${createUserDto.role}' not found`);
      }
    }

    let createdBy: User | undefined;
    if (createdByUserId) {
      createdBy = await this.userRepository.findOne({
        where: { uuid: createdByUserId },
      });
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const { role: _, ...userDataWithoutRole } = createUserDto;

    const user = this.userRepository.create({
      ...userDataWithoutRole,
      password: hashedPassword,
      role: role,
      createdBy: createdBy,
    });

    const savedUser = await this.userRepository.save(user);
    
    await this.clearUserCaches();
    
    return savedUser;
  }
  
  async findAllPaginated(
    query: UserQueryDto,
  ): Promise<{ entities: any; total: number; page: number; limit: number }> {
    return await this.cacheService.caching(USER_TABLE_NAME, query,
      async () => {
        const { page, limit, roleUuid, createdByUuid, status, search } = query;
        const queryBuilder = this.userRepository
          .createQueryBuilder('users')
          .leftJoin('users.role', 'role')
          .leftJoin('users.createdBy', 'creator');

        if (roleUuid) {
          queryBuilder.andWhere('users.roleUuid = :roleUuid', { roleUuid });
        }

        if (createdByUuid) {
          queryBuilder.andWhere('users.createdByUuid = :createdByUuid', { createdByUuid });
        }

        if (status) {
          queryBuilder.andWhere('users.status = :status', { status });
        }

        if (search) {
          queryBuilder.andWhere(
            '(users.full_name LIKE :search OR users.email_address LIKE :search)',
            { search: `%${search}%` }
          );
        }

        queryBuilder.orderBy('users.createdAt', 'DESC');
        queryBuilder.addSelect('role.name', 'roleName');
        queryBuilder.addSelect('creator.full_name', 'createdByName');

        const total = await queryBuilder.getCount();
        const { raw, entities } = await queryBuilder
          .skip((page - 1) * limit)
          .take(limit)
          .getRawAndEntities();

        return {
          entities: entities.map((user, index) => ({
            ...user,
            roleName: raw[index].roleName,
            createdByName: raw[index].createdByName,
          })),
          total,
          page,
          limit
        };
      },
    );
  }

  async findOneByOwnership(uuid: string, createdByUuid: string, hasReadAll: boolean): Promise<User> {
    return await this.cacheService.caching(
      USER_TABLE_NAME,
      { uuid, createdByUuid, hasReadAll },
      async () => {
        const user = await this.userRepository.findOne({
          where: { uuid },
          relations: ['role', 'createdBy'],
        });
        
        if (!user) {
          throw new NotFoundException(`User with ID ${uuid} not found`);
        }

        if (hasReadAll) {
          return user;
        }

        if (user.createdByUuid === createdByUuid) {
          return user;
        }

        throw new NotFoundException(`User with ID ${uuid} not found or you don't have access to it`);
      }
    );
  }

  async findOne(uuid: string): Promise<User> {
    return await this.cacheService.caching(
      USER_TABLE_NAME,
      { uuid },
      async () => {
        const user = await this.userRepository.findOne({
          where: { uuid },
          relations: ['role', 'createdBy'],
        });
        
        if (!user) {
          throw new NotFoundException(`User with ID ${uuid} not found`);
        }
        
        return user;
      },
      async (data) => plainToInstance(User, data)
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.cacheService.caching(
      USER_TABLE_NAME,
      { email },
      async () => {
        return await this.userRepository.findOne({
          where: { email },
          relations: ['role', 'createdBy'],
        });
      },
      async (data) => plainToInstance(User, data)
    );
  }

  async updateByOwnership(uuid: string, updateUserDto: UpdateUserDto, createdByUuid: string, hasUpdateAll: boolean): Promise<User> {
    const user = await this.findOneByOwnership(uuid, createdByUuid, hasUpdateAll);

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (updateUserDto.role) {
      const role = await this.roleRepository.findOne({
        where: { name: updateUserDto.role },
      });

      if (!role) {
        throw new NotFoundException(`Role '${updateUserDto.role}' not found`);
      }

      const { role: _, ...userDataWithoutRole } = updateUserDto;
      Object.assign(user, userDataWithoutRole);
      user.role = role;
    } else {
      Object.assign(user, updateUserDto);
    }

    const updatedUser = await this.userRepository.save(user);
    
    await this.clearUserCaches();
    
    return updatedUser;
  }

  async removeByOwnership(uuid: string, createdByUuid: string, hasDeleteAll: boolean): Promise<void> {
    const user = await this.findOneByOwnership(uuid, createdByUuid, hasDeleteAll);
    
    if (this.isProtectedAdminEmail(user.email)) {
      throw new ForbiddenException('Cannot delete protected admin account');
    }
    
    if (user.uuid === createdByUuid) {
      throw new ConflictException('You cannot delete your own account');
    }

    await this.userRepository.remove(user);
    
    await this.clearUserCaches();
  }

  async remove(uuid: string): Promise<void> {
    const user = await this.findOne(uuid);
    
    if (this.isProtectedAdminEmail(user.email)) {
      throw new ForbiddenException('Cannot delete protected admin account');
    }
    
    await this.userRepository.remove(user);
    
    await this.clearUserCaches();
  }

  async validatePassword(
    plainTextPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainTextPassword, hashedPassword);
  }
}
