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
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';
import { UpdateUserDto, CreateUserDto } from './dto/user.dto';

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
    // Initialize protected admin emails from environment variable
    const adminEmails = process.env.PROTECTED_ADMIN_EMAILS || 'admin@ezsalon.com';
    this.protectedAdminEmails = adminEmails.split(',').map(email => email.trim());
  }

  /**
   * Check if the given email is a protected admin email
   */
  private isProtectedAdminEmail(email: string): boolean {
    return this.protectedAdminEmails.includes(email);
  }

  /**
   * Clear all user-related caches including related entities
   */
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

    // Find the role if provided, otherwise leave it null
    let role: Role | null = null;
    if (createUserDto.role) {
      role = await this.roleRepository.findOne({
        where: { name: createUserDto.role },
      });

      if (!role) {
        throw new NotFoundException(`Role '${createUserDto.role}' not found`);
      }
    }

    // Find the creator if provided
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
    
    // Clear cache after create
    await this.clearUserCaches();
    
    return savedUser;
  }

  async findAllPaginated(paginationDto: PaginationDto): Promise<PaginatedResponse<User>> {
    const { page, limit } = paginationDto;
    return await this.cacheService.caching(
      USER_TABLE_NAME,
      { page, limit },
      async () => {
        const [users, total] = await this.userRepository
          .createQueryBuilder('user')
          .leftJoinAndSelect('user.role', 'role')
          .leftJoinAndSelect('user.createdBy', 'createdBy')
          .leftJoinAndSelect('createdBy.role', 'createdByRole')
          .select([
            'user.uuid',
            'user.email',
            'user.name',
            'user.phone',
            'user.avatar',
            'user.status',
            'user.createdAt',
            'user.updatedAt',
            'role.uuid',
            'role.name',
            'role.displayName',
            'role.description',
            'role.color',
            'role.createdAt',
            'role.updatedAt',
            'createdBy.uuid',
            'createdBy.email',
            'createdBy.name',
            'createdBy.phone',
            'createdBy.avatar',
            'createdBy.status',
            'createdBy.createdAt',
            'createdBy.updatedAt',
            'createdByRole.uuid',
            'createdByRole.name',
            'createdByRole.displayName',
            'createdByRole.description',
            'createdByRole.color',
            'createdByRole.createdAt',
            'createdByRole.updatedAt',
          ])
          .skip((page - 1) * limit)
          .take(limit)
          .orderBy('user.createdAt', 'DESC')
          .getManyAndCount();

        return new PaginatedResponse(users, total, page, limit);
      }
    );
  }

  async findByCreator(creatorId: string, paginationDto?: PaginationDto): Promise<PaginatedResponse<User> | User[]> {
    // If pagination is provided, return paginated results
    if (paginationDto) {
      const { page, limit } = paginationDto;
      return await this.cacheService.caching(
        USER_TABLE_NAME,
        { creatorId, page, limit },
        async () => {
          const [users, total] = await this.userRepository.findAndCount({
            select: [
              'uuid',
              'email',
              'name',
              'phone',
              'avatar',
              'status',
              'createdAt',
              'updatedAt',
            ],
            where: { createdBy: { uuid: creatorId } },
            relations: ['role', 'createdBy'],
            skip: (page - 1) * limit,
            take: limit,
            order: { createdAt: 'DESC' },
          });

          return new PaginatedResponse(users, total, page, limit);
        }
      );
    }

    // Legacy support - return all users (non-paginated)
    return await this.cacheService.caching(
      USER_TABLE_NAME,
      { creatorId },
      async () => {
        return await this.userRepository.find({
          select: [
            'uuid',
            'email',
            'name',
            'phone',
            'avatar',
            'status',
            'createdAt',
            'updatedAt',
          ],
          where: { createdBy: { uuid: creatorId } },
          relations: ['role', 'createdBy'],
          order: { createdAt: 'DESC' },
        });
      }
    );
  }

  async findOneByOwnership(uuid: string, requesterId: string, hasReadAll: boolean): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { uuid },
      relations: ['role', 'createdBy'],
    });
    
    if (!user) {
      throw new NotFoundException(`User with ID ${uuid} not found`);
    }

    // If user has read-all permission, they can access any user
    if (hasReadAll) {
      return user;
    }

    // Otherwise, they can only access users they created or themselves
    if (user.createdBy?.uuid === requesterId || user.uuid === requesterId) {
      return user;
    }

    throw new NotFoundException(`User with ID ${uuid} not found or you don't have access to it`);
  }

  async findOne(uuid: string): Promise<User> {
    return await this.cacheService.caching(
      USER_TABLE_NAME,
      { id: uuid },
      async () => {
        const user = await this.userRepository.findOne({
          where: { uuid },
          relations: ['role', 'createdBy'],
        });
        
        if (!user) {
          throw new NotFoundException(`User with ID ${uuid} not found`);
        }
        
        return user;
      }
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
      }
    );
  }

  async updateByOwnership(uuid: string, updateUserDto: UpdateUserDto, requesterId: string, hasUpdateAll: boolean): Promise<User> {
    // First check if user has access to this user
    const user = await this.findOneByOwnership(uuid, requesterId, hasUpdateAll);

    // Handle password update
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Handle role update
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
    
    // Clear cache after update
    await this.clearUserCaches();
    
    return updatedUser;
  }

  async removeByOwnership(uuid: string, requesterId: string, hasDeleteAll: boolean): Promise<void> {
    // First check if user has access to this user
    const user = await this.findOneByOwnership(uuid, requesterId, hasDeleteAll);
    
    // Protect admin accounts from deletion
    if (this.isProtectedAdminEmail(user.email)) {
      throw new ForbiddenException('Cannot delete protected admin account');
    }
    
    // Prevent users from deleting themselves
    if (user.uuid === requesterId) {
      throw new ConflictException('You cannot delete your own account');
    }

    await this.userRepository.remove(user);
    
    // Clear cache after delete
    await this.clearUserCaches();
  }

  async remove(uuid: string): Promise<void> {
    const user = await this.findOne(uuid);
    
    // Protect admin accounts from deletion
    if (this.isProtectedAdminEmail(user.email)) {
      throw new ForbiddenException('Cannot delete protected admin account');
    }
    
    await this.userRepository.remove(user);
    
    // Clear cache after delete
    await this.clearUserCaches();
  }

  async validatePassword(
    plainTextPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainTextPassword, hashedPassword);
  }
}
